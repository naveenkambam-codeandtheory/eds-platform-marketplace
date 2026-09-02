# PR Review Checklist

Review in this order. Architecture problems are cheap to fix in review and expensive to fix later; formatting is the reverse.

---

## 1. Architecture (block first)

- [ ] **Which Divergence Ladder rung is this?** Anything above L1 needs justification in the PR description.
- [ ] Could this have been solved at a lower rung? Specifically: would three component tokens have done it?
- [ ] Any new fork: does it meet all four criteria, and is the ADR linked in a header comment in the fork file (`<block>/<brand>/<brand>.js`)? Is the block's own name and UE model untouched?
- [ ] New block: is it named for a capability rather than a brand? Does an existing block already cover this?
- [ ] Does this add a brand-specific code path that brand #3 will inherit for no reason?

**The most common finding by a wide margin is a fork that should have been tokens or a variant.** Look for it first. Once a fork merges, it tends to stay.

---

## 2. Brand handling

- [ ] No brand-name conditionals. `if (brand === 'moog')` → `hasFeature('x')`.
- [ ] No literal brand asset paths. Built from `getBrand().key` or read from config.
- [ ] No re-deriving brand from `window.location` inside a block.
- [ ] Endpoints and index paths come from `getBrandConfig()`.
- [ ] User-facing strings come from placeholders, scoped to the brand prefix.

---

## 3. Styling

- [ ] No hex, `rgb()`, or font stacks in shared block CSS.
- [ ] Component tokens declared at the top of the block CSS with semantic defaults.
- [ ] Every contract token defined in every brand file; `validate-tokens.mjs` passes.
- [ ] Brand files contain custom properties only, no element or class selectors.
- [ ] `[data-brand]` overrides stay under roughly 20% of the block's CSS.
- [ ] Logical properties used for layout so RTL works.

---

## 4. Authoring

- [ ] `component-definition.json`, `component-models.json`, and `component-filters.json` updated in the same PR.
- [ ] Brand-exclusive blocks (gated purely by `hasFeature()`, no shared use case) filtered so they cannot be inserted on the wrong brand. A forked block (`<block>/<brand>/<brand>.js`) stays insertable everywhere by design — it degrades to the shared implementation on every other brand — so filter it only if the fork's authored content shape is genuinely incompatible with the shared one.
- [ ] Variants documented in the block README and exposed in the model.
- [ ] Block degrades gracefully on empty or unexpected authored content.

A block with no model is invisible to authors, so it is not shippable no matter how good the code is.

---

## 5. Performance

- [ ] Nothing added to the eager phase unless the LCP needs it.
- [ ] Third-party scripts in `delayed.js` only.
- [ ] Block JS under ~15 KB uncompressed; heavy dependencies load on interaction.
- [ ] `createOptimizedPicture` used; explicit width and height; only the LCP image is eager.
- [ ] No layout shift introduced; fixed dimensions or reserved space for async content.
- [ ] Lighthouse run on the preview URL for **every** brand.

---

## 6. Accessibility

- [ ] Keyboard operable end to end; focus order sensible; focus visible via `--color-focus`.
- [ ] Semantic elements and landmarks; heading order intact.
- [ ] Interactive elements have accessible names; icon-only controls labelled.
- [ ] Contrast checked **per brand**, since token values differ.
- [ ] `prefers-reduced-motion` respected.

---

## 7. Hygiene

- [ ] `aem.js` untouched.
- [ ] ESLint and Stylelint clean, zero warnings.
- [ ] No secrets, no keys, no internal hostnames.
- [ ] Conventional commit messages, brand in scope where applicable.
- [ ] README updated for the block; framework doc updated if a convention changed.

---

## 8. Verification

- [ ] Tested on every brand in the registry, not just the one in the ticket.
- [ ] Existing brands confirmed unaffected.
- [ ] Preview URLs for each brand included in the PR description.

---

## How to write the comment

Name the rung and the concrete fix, not the principle.

Weak: *"Avoid hardcoded values."*

Strong: *"`#0b5fff` on line 12 should be `--color-accent`, which both brand files already define. This is L1, so the `moog-cta` fork below it isn't needed either — `--cta-bg` in `drivparts.css` covers the difference and we keep one block."*

The reviewer's job in this codebase is mostly to hold the fork ratio down. Everything else is secondary, because everything else is fixable later at roughly the cost it would have been today.
