# Brand Onboarding

Target: a new brand in preview within a day. The whole job lives in the brand layer.

**The test that matters: onboarding must touch zero shared JavaScript.** If a step forces you to edit a block, stop and report it. The fix is to lift that difference into a token, a config flag, or content, not to add a branch. Every branch added during onboarding is a tax the next brand pays too.

---

## Step 1 — Register the brand

Add to `brands.json`:

```json
"brandthree": {
  "key": "brandthree",
  "name": "Brand Three",
  "pathPrefix": "/brandthree",
  "hosts": ["brandthree.com"],
  "locales": ["en-us"],
  "indexPath": "/brandthree/query-index.json",
  "features": { "commerce": false, "partsFinder": true },
  "endpoints": { "catalog": "/api/brandthree/catalog" }
}
```

Key rules: lowercase, no spaces or hyphens, used verbatim everywhere (file names, `data-brand`, directories, metadata). Pick it once and never vary it. Inconsistent brand keys are the most common cause of a token file that silently never loads.

Feature flags are named for capabilities the site has, never for brands.

---

## Step 2 — Scaffold

```bash
node scripts/new-brand.mjs brandthree
```

Creates `styles/brands/brandthree.css` pre-filled with every contract token as a `TODO`, plus `icons/brandthree/`, `fonts/brandthree/`, and a placeholders stub. Then it prints the remaining checklist.

---

## Step 3 — Fill the token contract

Work from the brand's design system and fill every `TODO`. Define private primitives first, then map the contract onto them:

```css
:root[data-brand='brandthree'] {
  --b3-green-600: #0f7b3f;
  --color-accent: var(--b3-green-600);
  /* ... */
}
```

Do not leave a token undefined hoping it will inherit. It will inherit from whichever brand loaded, which is a bug that surfaces on one page in production weeks later.

Check contrast **for this brand specifically**. A component that passes 4.5:1 for one brand's accent can fail for another's. Colour choices are not shared, so contrast results are not shared either.

---

## Step 4 — Assets

- Logo, inverse logo, favicon → `icons/brandthree/`
- Web fonts (woff2) → `fonts/brandthree/`
- `@font-face` in the brand token file, `font-display: swap`, fallback metrics matched with `size-adjust`

Confirm no other brand's fonts load on this brand's pages. Check the network panel on a real page, not just the config.

---

## Step 5 — Content tree

Content lead creates `/brandthree/` containing:

- `nav` and `footer` documents
- `placeholders.json` with every key the shared blocks read
- `metadata` sheet
- a home page and one page per template

Copy the placeholder keys from an existing brand so nothing is missed. A missing key renders a fallback string, which is easy to overlook in review.

---

## Step 6 — Assign the brand

In the bulk metadata sheet, set `theme: brandthree` for `/brandthree/**`, plus `nav` and `footer` paths if they differ from the convention.

This is what makes brand resolution work. Verify by loading a page and checking `document.documentElement.dataset.brand`.

---

## Step 7 — Indexing, sitemap, redirects

Index definitions live in the Configuration Service on current projects, editable at
`tools.aem.live` or through the admin API. The YAML below is the file-based equivalent,
still present on older projects and useful as a reference for the shape of a definition.

```yaml
  brandthree:
    include: ['/brandthree/**']
    target: /brandthree/query-index.json
```

Add the brand's sitemap configuration and any launch redirects under its prefix.

---

## Step 8 — Authoring surface

Scope `component-filters.json` so authors on this brand see only blocks that are valid for it. If the brand has no commerce, `commerce-storefront` should not be offerable. Filters are the structural guardrail that replaces relying on authors to remember.

---

## Step 9 — Templates

Build a template page per page type, pre-populated with the right blocks and sections. Templates are what make authoring fast and consistent; training is a supplement to them, not a replacement.

---

## Step 10 — Gates

```bash
node scripts/validate-tokens.mjs      # contract complete, no stray selectors
npm run lint                          # eslint + stylelint
```

Then on the preview URL for this brand:

- Lighthouse mobile, all four categories at 100
- axe-core clean on home, a listing page, and a detail page
- Contrast verified against this brand's tokens
- Every shared block rendered on a smoke page and visually checked
- Fonts, icons, logo all resolving from this brand's directories
- No console warnings from the brand-mismatch guard

---

## Step 11 — Sign-off

- [ ] Zero shared JavaScript modified (if not, log the defect)
- [ ] All contract tokens defined
- [ ] Brand resolves correctly on preview and live hostnames
- [ ] Placeholders complete, no fallback strings rendering
- [ ] Templates published
- [ ] Budgets met
- [ ] Existing brands re-verified as unaffected
- [ ] Onboarding time recorded, friction points logged for the framework backlog

That last item is what keeps the framework honest. Whatever slowed you down is the next thing to fix.
