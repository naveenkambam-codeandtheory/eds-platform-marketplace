# Block Development

## Contents
1. Anatomy
2. The decorate contract
3. Variants
4. Brand-aware blocks
5. Worked example: a header that serves two brands
6. Content-driven configuration
7. Blocks that fetch data
8. Common mistakes

---

## 1. Anatomy

```
blocks/<name>/
  <name>.js       required, default-exports decorate(block)
  <name>.css      required, tokens only
  README.md       required: purpose, variants, tokens read, authoring shape
  <brand>/        optional, only for a declared L4 fork — see below
    <brand>.js
    <brand>.css
```

Filenames match the folder name exactly, one level down too: a fork subfolder is named for the brand key, and the files inside it are named for the brand key again. The EDS loader derives paths from the block's class name, so `blocks/parts-finder/parts-finder.js` is the only layout that loads without custom loader logic — everything under a `<brand>/` subfolder is loaded by the block's own JS, never by the EDS loader directly.

Name blocks by **capability**, not by owner, and never by brand. `parts-finder` not `drivparts-parts-finder`, `commerce-storefront` not `drivparts-hybris-storefront`. An owner-named or brand-named block has to be renamed the day a second brand wants it, and renaming breaks every page that references it by name and every Universal Editor filter entry pointing at it. Brand-lock through Universal Editor filters and content availability instead, not through the block's name.

A brand-named subfolder inside the block — `blocks/<name>/<brand>/<brand>.js` and, if the styling diverges too, `blocks/<name>/<brand>/<brand>.css` — is reserved for a real L4 fork. The block keeps one name, one README, one Universal Editor model and filter entry; only the brand that actually diverged carries the extra weight. The fork file carries the ADR link in a header comment:

```js
// blocks/header/drivparts/drivparts.js
// FORK: see docs/adr/0007-drivparts-hybris-legacy.md
// Owner: @driv-lead · Re-merge review: 2027-03-01
```

The shared `<name>.js` is the only file EDS ever loads directly, so it stays the dispatcher — it tries the brand override first and falls back to its own shared implementation:

```js
import { loadCSS } from '../../scripts/aem.js';
import { getBrand } from '../../scripts/brand.js';

export default async function decorate(block) {
  const { key } = getBrand();
  const fork = await import(`./${key}/${key}.js`).catch(() => null);
  if (fork?.default) {
    loadCSS(`${window.hlx.codeBasePath}/blocks/header/${key}/${key}.css`).catch(() => {});
    return fork.default(block);
  }
  return decorateShared(block);
}

function decorateShared(block) { /* the shared implementation every other brand gets */ }
```

The dynamic `import()` 404s silently for every brand without an override — that's the point, it's the same "ask, don't derive" shape as the top-level per-brand CSS load in `loadEager`. `node scripts/validate-tokens.mjs` finds the fork by path (`blocks/<name>/<brandKey>/`), not by a renamed block, so the fork ratio still measures it and CI still gates it — see `references/tokens-and-styling.md` § Scoped brand overrides.

---

## 2. The decorate contract

```js
export default function decorate(block) {
  // block is the authored DOM. Read it, transform it in place.
}
```

- Synchronous by default. Return a promise only if the block genuinely must await something before it is usable.
- Transform, do not rebuild. The authored structure carries meaning and rebuilding from scratch loses it.
- Read config from the block's first rows with `readBlockConfig(block)` when the block takes key/value settings.
- Never assume shape. Authors will hand you an empty cell, a missing row, or an image where you expected text. A block that throws takes the whole page with it, so guard and degrade.

```js
import { readBlockConfig, createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const cfg = readBlockConfig(block);
  const rows = [...block.children];
  if (!rows.length) { block.remove(); return; }
  // ...
}
```

Use the helpers `aem.js` already provides rather than reimplementing them: `createOptimizedPicture`, `decorateIcons`, `fetchPlaceholders`, `toClassName`, `toCamelCase`, `readBlockConfig`, `loadCSS`, `getMetadata`.

---

## 3. Variants

Authors write `Cards (compact, dark)`. EDS produces `class="cards compact dark block"`. Read them from `classList`:

```js
const isCompact = block.classList.contains('compact');
```

Style them in the block's own CSS:

```css
.cards.compact { --card-padding: var(--space-3); }
```

Variants are the correct answer to "the layout differs between brands" far more often than a fork is. They cost roughly ten lines of CSS and no ongoing maintenance.

Document every variant in the block README and register it in `component-models.json` so authors can discover it. An undocumented variant is a variant that gets reinvented.

---

## 4. Brand-aware blocks

Ask the platform, never derive it yourself:

```js
import { getBrand, getBrandConfig, hasFeature } from '../../scripts/brand.js';
```

**Feature flags, not brand names.**

```js
// Wrong. Hardcodes the brand list into this file; brand #3 means a grep.
if (getBrand().key === 'drivparts') renderStorefront(block);

// Right. New brands opt in through brands.json alone.
if (hasFeature('commerce')) renderStorefront(block);
```

**Config, not literals.**

```js
// Wrong
const res = await fetch('/drivparts/query-index.json');
const logo = '/icons/drivparts/logo.svg';

// Right
const { indexPath, key } = getBrandConfig();
const res = await fetch(indexPath);
const logo = `/icons/${key}/logo.svg`;
```

**Strings from placeholders.**

```js
const ph = await fetchPlaceholders(getBrand().pathPrefix);
button.textContent = ph.findPartsCta || 'Find parts';
```

A literal string is a code change for every brand that wants different wording, and a blocker for localisation. A placeholder key is a spreadsheet cell.

`dataset.brand` on `<html>` exists for CSS. JavaScript asks `getBrand()`.

---

## 5. Worked example: a header that serves two brands

The requirement that usually triggers a fork request: brand A has a flat nav, brand B has a mega-menu with a part-number search. One block handles both.

```js
import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { getBrandConfig, hasFeature } from '../../scripts/brand.js';

export default async function decorate(block) {
  const { pathPrefix } = getBrandConfig();

  // L0 — the nav document differs per brand. Metadata points at it.
  const navPath = getMetadata('nav') || `${pathPrefix}/nav`;
  const html = await fetch(`${navPath}.plain.html`).then((r) => (r.ok ? r.text() : ''));
  if (!html) return;

  const nav = document.createElement('nav');
  nav.innerHTML = html;

  const sections = [...nav.children];

  // L2 — the block derives its variant from the shape of the content.
  // Deep nesting in the nav means a mega-menu; flat means a simple bar.
  const isMega = sections.some((s) => s.querySelector('ul ul'));
  block.classList.toggle('header--mega', isMega);

  // L3 — capability, not brand name.
  if (hasFeature('partsFinder')) {
    nav.append(await buildPartSearch(pathPrefix));
  }

  decorateIcons(nav);
  block.append(nav);
}
```

Three mechanisms, one block, zero forks. Adding brand #3 with a flat nav and no parts finder is a `brands.json` entry and a nav document.

The corresponding CSS uses component tokens so each brand can restyle without touching this file:

```css
.header {
  --header-height: var(--header-height-brand, 72px);
  --header-bg: var(--color-surface);
  block-size: var(--header-height);
  background: var(--header-bg);
}
.header--mega .nav-sections ul ul { /* mega layout */ }
[data-brand='drivparts'] .header { --header-height-brand: 96px; }
```

---

## 6. Content-driven configuration

Before adding a code branch, check whether the difference can be authored:

- **Bulk metadata** sets `theme`, `nav`, `footer`, and any page-level flag per folder. This is how a brand is assigned to a content tree without a deploy.
- **Section metadata** adds classes and data attributes to a section, which lets one block behave differently on one page.
- **Block config rows** let an author pass key/value settings into a block.
- **Fragments** let a shared block pull entirely different content per brand.

Something authorable is something a content team can change on a Tuesday afternoon. Something coded is a sprint.

---

## 7. Blocks that fetch data

- Endpoint comes from `getBrandConfig().endpoints`, never a literal.
- Never call a third-party API directly from a block. Proxy through the project's worker or edge function so keys stay out of the repo and CORS stays sane.
- No secrets in the repo, ever. The repo is public in most EDS setups.
- Fetch in the lazy or delayed phase unless the data is required for the LCP.
- Handle failure by degrading to something renderable. A dead endpoint should not blank a page.
- Cache per session where the data is stable, and key the cache by brand so two brands never see each other's data.

---

## 8. Common mistakes

| Mistake | Why it hurts | Fix |
|---|---|---|
| Rebuilding the DOM instead of decorating it | Loses authored semantics, breaks the editor | Transform in place |
| Reading brand from `window.location` in a block | Duplicates resolution logic that will drift | `getBrand()` |
| `if (brand === 'x')` | Brand list spread across N files | `hasFeature()` |
| Hardcoded strings | Blocks localisation and per-brand wording | Placeholders |
| Hardcoded colours | Rebrand becomes a repo-wide search and replace | Tokens |
| Third-party script in decorate | Destroys INP and LCP | `delayed.js` |
| No null guards | One bad cell blanks the page | Guard and degrade |
| Block with no UE model | Authors cannot insert it | Ship the model with the code |
| Copying a block to tweak it | Two codebases forever | Variant or component token |
| Renaming a block `<brand>-<capability>` to fork it | Breaks every page and UE filter that referenced the old name | `<capability>/<brand>/<brand>.js`, name unchanged |
