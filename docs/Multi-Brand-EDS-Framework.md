# Multi-Brand EDS Framework

**Adobe Edge Delivery Services · Moog Parts + DRiVParts + brand N**
Version 1.0 · Owner: EDS Architecture Guild

---

## 0. How to read this

This document is the **decision layer**: what we do, and why. It is written to outlive the current two brands and to be lifted into the next multi-brand EDS engagement with only the brand registry changed.

The **execution layer** lives in the companion `brand-*` skills, which any developer or Claude session loads to get the same conventions applied consistently. Framework = law. Skill = enforcement.

Three audiences:
- **Architects / leads** — Sections 1 to 6, 12, 13.
- **Developers** — Sections 7 to 11, plus the skill.
- **Content and brand teams** — Sections 9, 10, 14.

---

## 1. Executive summary

We build **one repository, one pipeline, N brands**, where a brand is a *data* concern (tokens + content + config), not a *code* concern. Code forks are permitted but they are an exception that must be paid for with an ADR, not a default that gets applied per block.

The single most important number in this framework is the **fork ratio**: the percentage of blocks that exist in more than one brand-specific copy. We target **under 15%**. Every architectural rule below exists to keep that number down, because that number is what determines whether onboarding brand #3 takes a week or a quarter.

**What we keep from the current proposal:** single repo, token-driven styling, shared `aem.js` untouched, the "would changing content and tokens be enough?" test, a fixed token contract.

**What we change:** brand-prefixed blocks stop being the default and become the last rung of a five-step ladder. Brand resolution moves from authoring discipline to metadata + runtime, so an author cannot put the wrong brand's header on a page. Component-level tokens are introduced as the mechanism that absorbs most of the differences that would otherwise cause a fork.

---

## 2. Critique of the current proposal

The attached document is directionally right and its instincts about ownership and tokens are good. These are the specific things I would change before this becomes the standard.

### 2.1 Brand-prefixed blocks as the default is the core problem

The document concludes that brand forks should get their own block name (`moog-header`, `drivparts-header`) and lists this as "FINAL". As an escape hatch this is fine. As the default it inverts the economics of the platform.

- **Cost scales linearly with brands, not with features.** With 25 blocks and 3 brands you are maintaining up to 75 block implementations. Every accessibility fix, every Core Web Vitals regression, every analytics change is applied N times, and the Nth application is the one that gets forgotten.
- **The stated benefit is thin.** "No custom loader logic needed" is true, but the alternative that the document rejects (nested `/blocks/brands/<brand>/`) is not the only alternative. EDS already ships two zero-code mechanisms for this: **block variants** and **content-driven configuration**. Neither requires touching `aem.js`.
- **It makes brand a property of authoring discipline.** The document is admirably honest about this trade-off, but it should be treated as a defect rather than a trade-off. "Author training is the real brand boundary" means a mis-authored page silently ships the wrong brand's header. Guardrails should be structural, not procedural.

**Change:** forks are allowed, keep the `<brand>-<block>` naming when a fork is genuinely warranted, but a fork now requires passing the Divergence Ladder (Section 7) and an ADR. Default is shared.

### 2.2 Header and footer are the worst possible example of a fork

The document uses header/footer as the illustrative fork case. In EDS these are the two blocks that are *already* content-driven out of the box. The boilerplate header reads `getMetadata('nav')` and falls back to `/nav`; the footer reads `getMetadata('footer')`. Point `/moog/**` at `/moog/nav` and `/drivparts/**` at `/drivparts/nav` through the bulk metadata sheet and you have two completely different navigations with zero JavaScript forked.

A mega-menu with an embedded part-number search versus a flat nav is a real structural difference, but it is a difference in **nav document shape**, which the same block can branch on (does the nav have four sections or two? is there a `search` section?), plus a variant class. That is a `if (navSections.length)` branch, not a second codebase.

**Change:** header and footer are shared blocks in this framework, driven by per-brand nav/footer fragments and section-shape detection. If DRiV's mega-menu genuinely cannot be expressed that way after an honest attempt, it forks with an ADR, but it is not the starting assumption.

### 2.3 Brand-prefixing DRiV-exclusive blocks is premature lock-in

`drivparts-parts-finder`, `drivparts-where-to-buy-search`, `drivparts-part-details` are prefixed "for consistency". But these describe *capabilities* that a second automotive-parts brand will almost certainly want. The day Moog wants a parts finder, you either rename the block (breaking every authored page that references it) or fork it.

**Change:** name blocks by capability, not by owner. `parts-finder`, `where-to-buy`, `part-details`, `brand-nav`. Brand-lock them through the Universal Editor component filters and through content availability, not through the folder name. Prefix only when the block is hard-wired to a brand-exclusive system in a way no other brand could reuse (a Hybris storefront bound to DRiV's specific commerce instance is a legitimate case, and even that is better modelled as `commerce-storefront` reading endpoint config from the brand registry).

### 2.4 The document contradicts itself on folder structure

Section 2 rejects nesting under `/blocks/brands/<brand>/`. Section 3's structure listing then includes `/blocks/{brand}/ ← brand-specific block overrides/additions (rare)` immediately before showing the flat prefixed layout. Pick one. This framework picks flat, prefixed, at `/blocks/<brand>-<block>/`, consistent with the default EDS loader.

### 2.5 Missing: how the browser knows which brand it is

`brand.js` is mentioned as resolving brand "from path/hostname" and setting `dataset.brand`, but there is no specification of precedence, no fallback behaviour, no story for avoiding a flash of unstyled content, and no registry of brands. This is the single highest-risk unspecified piece, because it is on the critical rendering path. Section 6 specifies it.

### 2.6 Missing: content topology

There is no mention of content sources, path strategy, per-brand indexes, per-brand sitemaps, per-brand redirects, or per-brand placeholders. In EDS the content topology *is* the multi-brand architecture; the repo layout is secondary. Section 5 covers it. Note that content-source binding now lives in the Configuration Service rather than in an `fstab.yaml` at the repo root, which is why it is easy to overlook when reading a repository.

### 2.7 Missing: the authoring surface cost of forking

`component-definition.json`, `component-models.json` and `component-filters.json` are single files at the repo root. Every forked block adds an entry to all three. With prefixed forks as the default, the Universal Editor component picker shows authors `moog-header`, `drivparts-header`, `brandthree-header`, and filters are the only thing stopping the wrong one being inserted. This is a real, compounding tax that the document does not price in.

### 2.8 Missing: quality gates and non-functional standards

No performance budget, no Core Web Vitals governance, no accessibility baseline, no linting or test strategy, no CI checks, no CODEOWNERS, no ADR process, no definition of done, no deprecation policy. A framework that other projects will copy needs these more than it needs a folder listing. Sections 11 to 14.

### 2.9 Minor but worth fixing

- Token file naming is inconsistent (`brands/driv.css` in one place, `brands/drivparts.css` in another). Brand keys must be defined once and used identically everywhere.
- `--brand-*` on every token is redundant prefixing, since in a multi-brand system *all* tokens are brand-scoped. Role-based names (`--color-*`, `--space-*`) carry more information and survive a rebrand better.
- "Only the repo root/README was reviewed" is an honest caveat, and it should be closed before implementation starts, because whether `brand.js` and token files already exist changes the migration plan.

---

## 3. Architecture principles

These are the tie-breakers when a decision is genuinely close. Quote them in PR review.

1. **Brand is data.** A brand is a row in a registry plus a token file plus a content tree. If adding a brand requires editing shared JavaScript, the architecture has leaked.
2. **The platform is boring.** `aem.js` is never modified. No bundler, no framework, no transpiler. EDS's performance comes from doing almost nothing; every abstraction we add is a withdrawal from that account.
3. **Content beats config, config beats code.** Solve it in the document first. Then in the brand registry. Only then in a block.
4. **Divergence must be paid for.** Any brand-specific code path is a permanent tax. It gets an ADR, an owner, and a review date.
5. **Guardrails are structural.** If the only thing preventing a mistake is that someone remembers not to make it, it is not prevented.
6. **Optimise for brand #3.** Every decision is evaluated against a brand that does not exist yet and whose requirements we do not know.

---

## 4. The four-layer model

```
┌──────────────────────────────────────────────────────────────┐
│ L4  BRAND        tokens · content · icons · fonts · config   │  changes per brand
│                  styles/brands/*.css · brands.json           │  no JS
├──────────────────────────────────────────────────────────────┤
│ L3  EXPERIENCE   blocks · variants · auto-blocks             │  shared, config-aware
│                  blocks/**                                    │
├──────────────────────────────────────────────────────────────┤
│ L2  PLATFORM     scripts.js · brand.js · config.js           │  shared, brand-agnostic
│                  delayed.js · placeholders · utils            │
├──────────────────────────────────────────────────────────────┤
│ L1  CORE         aem.js · EDS pipeline · AEM Code Sync       │  never modified
└──────────────────────────────────────────────────────────────┘
```

**The rule that makes this work:** dependencies point downward only. L3 blocks read L4 through CSS custom properties and the brand config object. Blocks never `import` a brand file, never test `brand === 'moog'` inline, and never hardcode a brand asset path.

Anti-pattern, and the one most likely to appear first:

```js
// L3 block reaching sideways into L4. Rejected in review.
if (getBrand() === 'moog') { logo = '/icons/moog/logo.svg'; }
```

Correct:

```js
// Block asks the platform; the platform reads the registry.
const { logo } = getBrandConfig();
```

---

## 5. Repository and content topology

### 5.1 Repository strategy — confirmed

Single repo, multi-site. The document's reasoning holds and I agree with it, including the point that multi-repo is an org decision rather than a technical one. Add one trigger to the list: split only when two brands need **different release cadences that block each other**, which is the failure mode that actually forces the split in practice.

### 5.2 Directory structure

```
/
├── blocks/
│   ├── header/                    shared, content-driven
│   ├── footer/
│   ├── cards/  columns/  hero/  fragment/  accordion/  tabs/  carousel/
│   ├── parts-finder/              capability-named, brand-agnostic
│   ├── where-to-buy/
│   ├── part-details/
│   ├── commerce-storefront/       endpoint from brand registry
│   └── drivparts-hybris-legacy/   fork: requires ADR-XXX in header comment
│
├── scripts/
│   ├── aem.js                     L1 — untouched
│   ├── scripts.js                 L2 — eager/lazy/delayed orchestration
│   ├── brand.js                   L2 — brand resolution + config accessor
│   ├── delayed.js
│   ├── placeholders.js
│   └── lib/                       shared utils (dom, fetch, format)
│
├── styles/
│   ├── styles.css                 semantic tokens only, no literals
│   ├── tokens/
│   │   ├── contract.json          the required token contract (CI-enforced)
│   │   └── primitives.css         spacing/type scale shared by all brands
│   ├── brands/
│   │   ├── moog.css               brand token values
│   │   └── drivparts.css
│   ├── fonts.css                  @font-face, brand-scoped families
│   └── lazy-styles.css
│
├── icons/         {shared}/ moog/ drivparts/
├── fonts/         moog/ drivparts/
├── tools/         sidekick config, authoring helpers
├── ue/            Universal Editor config
├── docs/
│   ├── adr/       architecture decision records
│   └── brand-onboarding.md
├── brands.json                    THE brand registry
├── component-definition.json  component-models.json  component-filters.json
├── head.html      404.html    redirects.json    helix-query.yaml
└── .github/workflows/             lint · tokens · lighthouse · a11y
```

Deltas from the attached document: `/blocks/{brand}/` is removed (contradiction resolved), `brands.json` and `styles/tokens/` are added, `locales.js` and `drivparts-paths.js` are folded into `scripts/lib/` and the brand registry respectively, and `docs/adr/` is added.

### 5.3 URL and content strategy

Path-prefixed, one content tree per brand:

```
/moog/**          → Moog content source        → brand: moog
/drivparts/**     → DRiVParts content source   → brand: drivparts
/                 → redirect or brand selector
```

Path prefixes rather than hostname-only, because they make brand visible in preview URLs, in RUM, in local development, and in the sidekick, without DNS work per environment. Production hostnames map onto the prefixes at the CDN. Each brand gets its own `nav`, `footer`, `placeholders.json`, `metadata` sheet, `query-index`, and sitemap under its prefix.

**The repoless alternative.** Because the Configuration Service decouples configuration from the repository, one code repo can drive several sites, each with its own content source and hostname. That buys cleaner separation and independent publishing per brand, at the cost of N site configurations instead of one. Both layouts work with everything in this framework; only brand resolution changes. Under repoless, `pathPrefix` is `/` for every brand and resolution falls to metadata and hostname, which is precisely why the order in Section 6.2 covers all three. Decide before content exists.

Per-brand indexing in `helix-query.yaml`:

```yaml
version: 1
indices:
  moog:
    include: ['/moog/**']
    target: /moog/query-index.json
    properties: { title: {select: head > title, value: textContent(el)} }
  drivparts:
    include: ['/drivparts/**']
    target: /drivparts/query-index.json
```

Blocks that read an index take the path from the brand config, never a literal.

---

## 6. Brand resolution (the critical path)

This is the piece the current document leaves underspecified. It runs before first paint, so it must be synchronous, allocation-free, and incapable of throwing.

### 6.1 The registry

`brands.json` is the only place a brand is declared.

```json
{
  "default": "moog",
  "brands": {
    "moog": {
      "key": "moog",
      "name": "Moog Parts",
      "pathPrefix": "/moog",
      "hosts": ["moogparts.com", "www.moogparts.com"],
      "locales": ["en-us", "en-ca", "fr-ca"],
      "indexPath": "/moog/query-index.json",
      "features": { "commerce": false, "partsFinder": true },
      "endpoints": { "catalog": "/api/moog/catalog" }
    },
    "drivparts": {
      "key": "drivparts",
      "name": "DRiVParts",
      "pathPrefix": "/drivparts",
      "hosts": ["drivparts.com"],
      "locales": ["en-us"],
      "indexPath": "/drivparts/query-index.json",
      "features": { "commerce": true, "partsFinder": true },
      "endpoints": { "catalog": "/api/driv/catalog", "storefront": "/api/driv/hybris" }
    }
  }
}
```

Onboarding brand #3 starts as one object here.

### 6.2 Resolution order

1. `getMetadata('theme')` — set per folder in the bulk metadata sheet. Authors control it, it ships inside the served HTML, and it costs zero requests.
2. Path prefix match against the registry.
3. Hostname match against the registry.
4. `default`.

Metadata first is deliberate: it lets content teams stand up a brand section without a code deploy, and it keeps preview and live consistent. Path and host are the safety net.

### 6.3 Implementation contract for `brand.js`

```js
// scripts/brand.js — L2. No DOM writes beyond the root dataset. Never throws.
let resolved;

export function getBrand() {
  if (resolved) return resolved;
  const meta = getMetadata('theme');
  resolved = REGISTRY.brands[meta]
    ?? matchByPath(window.location.pathname)
    ?? matchByHost(window.location.hostname)
    ?? REGISTRY.brands[REGISTRY.default];
  return resolved;
}

export const getBrandConfig = () => getBrand();
export const hasFeature = (f) => Boolean(getBrand().features?.[f]);
```

And in `scripts.js`, inside `loadEager`, before `body.classList.add('appear')`:

```js
const brand = getBrand();
document.documentElement.dataset.brand = brand.key;
document.documentElement.lang = getLocale(brand);
await loadCSS(`${window.hlx.codeBasePath}/styles/brands/${brand.key}.css`);
```

The boilerplate keeps `body` hidden until `appear` is added, so awaiting the token file there gives zero-flicker branding without an inline script in `head.html`. `head.html` stays brand-free and minimal, which matters because it is shared by every brand and every byte in it is on every page.

### 6.4 The structural guardrail

Because brand is resolved rather than authored, a mis-placed block is detectable. In non-production environments, `scripts.js` asserts that any block whose name is brand-prefixed matches the resolved brand, and surfaces it in the console and in the sidekick. In production it degrades to a RUM event rather than a visible error. This replaces "author training is the brand boundary" with something a build can catch.

---

## 7. The Divergence Ladder

**When two brands need something different, climb from the bottom and stop at the first rung that works.** Do not skip rungs. The rung you stop at goes in the PR description.

| Rung | Mechanism | Cost | Use when |
|---|---|---|---|
| **L0** | **Content** — different document, fragment, or sheet | Zero | The markup shape is the same and only words, images, links differ |
| **L1** | **Tokens** — brand token values, including component tokens | Zero code | Colour, type, spacing, radius, elevation, logo |
| **L2** | **Variant** — `Cards (compact)` → `.cards.compact` | ~10 lines CSS | Layout or density differs; behaviour is identical |
| **L3** | **Config** — `hasFeature()` / `getBrandConfig()` branch | One branch | Behaviour differs on a named capability, not on a brand name |
| **L4** | **Fork** — `<brand>-<block>/` | Permanent | Structure and behaviour are fundamentally different |

### 7.1 Worked examples

**Header, Moog flat nav vs DRiV mega-menu with part search.** The document calls this L4. It is L0 + L2 + L3. The nav document differs per brand (L0). The header block detects how many sections the nav has and whether a `search` section is present, and applies `.header--mega` (L2). Part search rendering is gated on `hasFeature('partsFinder')` (L3). One block, three mechanisms, no fork.

**Card corner radius and brand accent.** L1. `--card-radius`, `--card-accent`.

**DRiV storefront on Hybris; Moog has no commerce.** L3. `commerce-storefront` reads `endpoints.storefront`; the block is filtered out of Moog's authoring surface entirely. Only if DRiV's Hybris integration turns out to require a genuinely different DOM contract does it become L4, as `drivparts-hybris-legacy`, with an ADR that states the trigger for retiring it.

**Where-to-buy with a completely different result model per brand.** Likely L3 with a per-brand adapter in `scripts/lib/adapters/`, not a forked block. The rendering is the same; the data shape is not. Adapters are cheap; blocks are not.

### 7.2 Fork criteria (all four must hold)

1. More than roughly 40% of the block's JavaScript would differ.
2. The difference is structural or behavioural, not visual or textual.
3. L0 to L3 have been genuinely attempted and the attempt is described in the PR.
4. An ADR exists, is linked in a header comment in the block's JS, and names an owner and a review date.

### 7.3 Fork budget

Fork ratio target **< 15%** of blocks. It is reported by CI on every PR. Crossing 20% triggers an architecture review, not an approval. This number is the health metric for the whole framework, and it is the one thing worth putting on a dashboard.

### 7.4 CSS-only brand overrides

Small brand-specific styling that does not deserve a token lives inside the shared block's own CSS, scoped:

```css
/* blocks/header/header.css */
[data-brand='drivparts'] .header .nav-sections { --nav-gap: var(--space-6); }
```

Capped at roughly 20% of the block's CSS. Past that cap, either promote the difference to a component token (preferred) or escalate to L4.

---

## 8. Naming and ownership conventions

| Thing | Convention | Example |
|---|---|---|
| Brand key | lowercase, no spaces, defined once in `brands.json` | `moog`, `drivparts` |
| Shared block | lowercase kebab, named for capability | `parts-finder` |
| Forked block | `<brand-key>-<capability>` | `drivparts-hybris-legacy` |
| Variant | lowercase kebab, authored in parentheses | `Cards (compact, dark)` |
| Block files | folder name repeated | `blocks/hero/hero.js`, `hero.css` |
| Semantic token | `--<role>-<name>-<modifier>` | `--color-accent-hover` |
| Component token | `--<block>-<property>` | `--header-height` |
| Branch | `<type>/<ticket>-<slug>` | `feat/DRIV-412-parts-finder` |
| Commit | Conventional Commits, brand in scope when applicable | `fix(moog-header): correct focus order` |

`CODEOWNERS` mirrors this. Shared blocks require an architecture-guild reviewer; brand token files and brand-prefixed blocks require that brand's team. That way the expensive changes get the expensive review and the cheap ones do not.

---

## 9. Design token architecture

Three tiers. The middle tier is the contract; the other two are free to vary.

```
PRIMITIVES  (shared scale)      --size-4, --weight-600, --duration-fast
     ↓
SEMANTIC    (THE CONTRACT)      --color-accent, --font-heading, --space-section
     ↓ every brand file must define every name in contract.json
COMPONENT   (block-level)       --header-height, --card-radius, --button-bg
     ↓ default to a semantic token; a brand may override just this
```

The component tier is the part missing from the current proposal and it is what actually prevents forks. A block author writes `background: var(--button-bg, var(--color-accent))`. A brand that needs a different button treatment overrides `--button-bg` in its own file. Nobody forks anything.

Rules:
- Shared block CSS references custom properties only. No hex, no `rgb()`, no font stacks, no magic pixel values for anything themable. CI greps for violations.
- Brand files contain custom property definitions only. No selectors beyond `:root` and `[data-brand='<key>']`, no `@media` that changes layout, no block styling. A brand file that contains a rule for `.cards` has become a fork in disguise.
- The contract is versioned. Adding a required token is a breaking change to every brand and needs an ADR plus a migration PR that fills the value for all existing brands in the same commit.

Token contract, current baseline:

```
colour     --color-accent  --color-accent-hover  --color-accent-contrast
           --color-text  --color-text-muted  --color-text-inverse
           --color-surface  --color-surface-raised  --color-surface-inverse
           --color-border  --color-focus  --color-danger  --color-success
type       --font-heading  --font-body  --font-mono
           --font-size-{xs,s,m,l,xl,2xl,3xl}  --line-height-{tight,base,loose}
space      --space-{1,2,3,4,6,8,12,16}  --space-section  --space-gutter
shape      --radius-{none,s,m,l,full}  --shadow-{s,m,l}
layout     --layout-max-width  --layout-content-width
motion     --duration-{fast,base,slow}  --easing-standard
brand      --brand-logo  --brand-logo-inverse  --brand-favicon
```

Enforced by `scripts/validate-tokens.mjs` in the skill, wired into CI. A brand file missing a contract token fails the build rather than silently inheriting Moog's colours.

---

## 10. Content and authoring model

- **Per-brand fragments.** `nav`, `footer`, and reusable fragments live under each brand prefix. The bulk metadata sheet sets `theme`, `nav`, and `footer` per folder, so brand assignment is content-side and needs no deploy.
- **Placeholders.** `fetchPlaceholders('/moog')` reads `/moog/placeholders.json`. All user-facing strings in shared blocks come from placeholders, never from literals, so a new brand can restate every label without touching JS. This also gives localisation for free.
- **Universal Editor.** `component-filters.json` scopes which blocks are offered where. Forked blocks must be filtered so the wrong brand's block cannot be inserted. Every new block ships its definition, model, and filter entry in the same PR as its code. A block without a model is invisible to authors and does not count as done.
- **Templates.** Each brand gets template pages for its common page types, pre-populated with the correct blocks. This is what makes authoring fast; author training is a supplement to it, not a substitute.
- **Redirects and sitemaps** are maintained per brand prefix.

---

## 11. Performance, accessibility, SEO

EDS's value proposition is speed. Treat regressions as build failures, not backlog items.

**Budgets, enforced per PR on the preview URL:**

| Metric | Budget |
|---|---|
| Lighthouse Performance / A11y / Best Practices / SEO | ≥ 100 / 100 / 100 / 100 (mobile) |
| LCP | < 2.5 s (target < 1.5 s) |
| CLS | < 0.1 |
| INP | < 200 ms |
| Eager-phase JS beyond `aem.js` + `scripts.js` | < 10 KB |
| Per-block JS | < 15 KB uncompressed |
| Brand token file | < 8 KB |

**Phase discipline.** Eager loads only what the LCP needs: brand tokens, the first section, the LCP image. Lazy loads everything else. Delayed carries all third-party tags with no exceptions, because that is where every EDS project's performance goes to die.

**Fonts.** Brand-scoped `@font-face`, `font-display: swap`, fallback metrics matched with `size-adjust` to keep CLS at zero. A brand never downloads another brand's fonts. Two brands' worth of preloads in the shared `head.html` is a silent tax on both.

**Images.** `createOptimizedPicture` always. Explicit width and height. Only the LCP image is eager; everything else is lazy.

**Accessibility baseline:** WCAG 2.2 AA. Keyboard operable, visible focus using `--color-focus`, correct landmarks and heading order, 4.5:1 contrast verified **per brand** since token values differ, `prefers-reduced-motion` respected. Contrast is checked automatically against each brand's token file, because a shared component that passes for Moog can fail for DRiV.

**RUM.** Keep `sampleRUM` intact and tag events with the resolved brand so Core Web Vitals can be read per brand rather than as a blended average that hides a problem in the smaller brand.

---

## 12. Quality gates and delivery

**Local:** `aem up`, plus `npm run lint` before push via husky.

**CI on every PR:**

1. ESLint (Airbnb base) and Stylelint, zero warnings.
2. Token contract validation, all brands.
3. Hardcoded-literal scan of shared block CSS.
4. Block manifest check: every block has `.js`, `.css`, a UE model, and a README stanza.
5. Unit tests for pure logic in `scripts/lib/` via `@web/test-runner`.
6. Lighthouse CI against the preview URL, one run per brand.
7. axe-core scan on representative pages, one per brand.
8. Fork-ratio report posted as a PR comment.

**Environments:** feature branch preview → `main` preview → live via AEM Code Sync. Nothing merges to `main` without a green preview on **both** brands, because the whole point of a shared codebase is that a change is a change to everyone.

**Definition of done:** code + UE model + filter entry + tokens for all brands + a11y pass + budgets met + docs updated + verified on every brand.

---

## 13. Governance

- **ADRs** in `docs/adr/`, numbered, immutable once accepted, superseded rather than edited. Required for: any L4 fork, any token contract change, any new third-party dependency, any change to brand resolution.
- **New shared block** needs a lightweight RFC first: what it does, why no existing block covers it, which brands need it, its token surface.
- **Architecture guild** reviews shared-layer PRs, owns the contract, publishes the fork ratio monthly.
- **Deprecation.** Blocks are marked deprecated in their README and UE model, kept for one quarter, then removed. Forks get a mandatory review date at creation; a fork that could be re-merged and has not been is a finding.
- **Reusing this framework:** fork `brands.json`, `styles/tokens/contract.json`, the skill, and this document. Everything project-specific is confined to those files by design.

---

## 14. Brand onboarding playbook

Target: **a new brand live in preview within one day**, entirely inside L4 of the layer model.

| # | Step | Owner | Output |
|---|---|---|---|
| 1 | Add brand object to `brands.json` | Dev | key, prefix, hosts, locales, features |
| 2 | Run `node scripts/new-brand.mjs <key>` | Dev | token file, icon/font dirs, placeholders stub |
| 3 | Fill token contract values from the brand's design system | Design + Dev | complete `styles/brands/<key>.css` |
| 4 | Add fonts, icons, logo | Design | `fonts/<key>/`, `icons/<key>/` |
| 5 | Create content tree, mount content source | Content lead | `/<key>/` with `nav`, `footer`, `placeholders.json`, `metadata` |
| 6 | Set `theme: <key>` in bulk metadata for `/<key>/**` | Content lead | brand resolves correctly |
| 7 | Add index to `helix-query.yaml`, sitemap, redirects | Dev | per-brand index live |
| 8 | Scope UE filters for the brand | Dev | authors see only valid blocks |
| 9 | Build template pages | Content + Dev | one per page type |
| 10 | Run the gates: contrast per brand, Lighthouse, axe | Dev | all green |
| 11 | Author a smoke page exercising every shared block | Content | visual QA sheet |

**Success criterion, and the honest test of this whole framework:** steps 1 to 11 touch **zero shared JavaScript**. If a step requires editing a block, that is a defect in the framework, and the fix is to lift the difference into tokens, config, or content rather than to add a branch.

---

## 15. Anti-patterns

| Anti-pattern | Why it hurts | Instead |
|---|---|---|
| `if (brand === 'moog')` inside a block | Brand list hardcoded in N places; brand #3 means a grep | `hasFeature('x')` |
| Forking a block for colour or copy | Permanent cost for a zero-cost problem | Tokens or content |
| Hex values in shared block CSS | Rebrand becomes a search-and-replace across the repo | Semantic tokens |
| Editing `aem.js` | Breaks upgrades forever | Extend in `scripts/lib/` |
| Brand assets referenced by literal path | Silently 404s for the next brand | Brand config |
| A brand token file containing selectors | A fork wearing a token file's clothes | Component tokens |
| Third-party script in eager or lazy | Kills LCP and INP | `delayed.js` |
| Prefixing a block "for consistency" | Locks a reusable capability to one brand | Capability name + UE filter |
| Testing on one brand only | Ships a break to the other one | CI runs every brand |

---

## 16. Adoption roadmap

**Phase 1 — Foundation (weeks 1 to 2).** Land `brands.json`, `brand.js`, resolution with the `appear` gate, `contract.json` with both brand files filled, CI for lint and tokens. Close the open question from the reference-repo review: confirm what already exists in `blocks/`, `scripts/`, `styles/` before writing migration tickets.

**Phase 2 — De-fork (weeks 3 to 6).** Inventory every existing block against the Divergence Ladder. Merge `moog-*`/`drivparts-*` pairs down to shared + tokens + variants, header and footer first since they are the highest-traffic and the best proof. Rename capability blocks off their `drivparts-` prefix with redirects for authored references. Publish the starting fork ratio.

**Phase 3 — Harden (weeks 7 to 10).** Lighthouse CI and axe per brand, per-brand RUM tagging, UE filters, template pages, ADR backlog for every surviving fork.

**Phase 4 — Prove (weeks 11 to 12).** Onboard a throwaway brand #3 against the Section 14 playbook and time it. Whatever forces you to touch shared JS is the framework's remaining debt, and that list is the Phase 5 backlog.

---

## Appendix A — ADR template

```markdown
# ADR-0007: Fork drivparts-hybris-legacy
Status: Accepted · Date: 2026-09-01 · Owner: @driv-lead · Review by: 2027-03-01

## Context
What differs, which brands, what the content/design constraint is.

## Ladder attempts
L0 content: ...  L1 tokens: ...  L2 variant: ...  L3 config: ...  why each failed.

## Decision
What we are doing.

## Consequences
Cost, duplicated surface, what would let us re-merge, how we will know.
```

## Appendix B — PR checklist

```markdown
- [ ] Divergence Ladder rung reached: L__ (justify anything above L1)
- [ ] No brand-name conditionals in block code
- [ ] Shared CSS uses tokens only; no literals
- [ ] All brand token files updated; contract validation passes
- [ ] UE definition + model + filter entry included
- [ ] Verified on every brand in preview
- [ ] Budgets met (LCP/CLS/INP, block JS size)
- [ ] a11y: keyboard, focus, contrast per brand
- [ ] ADR linked if this adds or changes a fork
```
