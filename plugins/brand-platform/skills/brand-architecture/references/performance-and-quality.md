# Performance and Quality

EDS is fast because it does almost nothing. Every abstraction is a withdrawal from that account. Budgets are build failures, not backlog items.

---

## Budgets

| Metric | Budget |
|---|---|
| Lighthouse mobile, all four categories | 100 |
| LCP | < 2.5 s (target < 1.5 s) |
| CLS | < 0.1 |
| INP | < 200 ms |
| Eager JS beyond `aem.js` + `scripts.js` | < 10 KB |
| Per-block JS | < 15 KB uncompressed |
| Brand token file | < 8 KB |
| `head.html` | keep minimal, shared by all brands |

Measured per brand. A blended average hides a regression in the smaller brand, which is exactly where nobody is looking.

---

## The three phases

**Eager** — what the LCP needs and nothing else: brand token file, first section, LCP image. Brand resolution and the token CSS load here, awaited before `body.classList.add('appear')`, which is what gives zero-flicker branding without an inline script in `head.html`.

**Lazy** — everything below the fold, remaining blocks, header and footer, `lazy-styles.css`, fonts.

**Delayed** — every third-party tag without exception: analytics, chat, consent, personalisation, tag managers. This is the single highest-leverage rule on the list. Third-party code in the eager or lazy phase is where EDS projects lose their scores, and it happens by accretion, one "small" tag at a time.

Adding anything to eager is an architecture decision. Say so in the PR.

---

## Fonts

Layout shift from font swap is the most common CLS source on EDS sites.

- Brand-scoped `@font-face`; a brand never downloads another brand's fonts.
- `font-display: swap`.
- Fallback metrics matched with `size-adjust`, `ascent-override`, `descent-override` so swapping does not move text.
- Preload at most the one face the LCP needs, and only for the resolved brand. Preloading both brands' fonts in the shared `head.html` taxes both.
- woff2 only.

---

## Images

- `createOptimizedPicture()` for everything.
- Explicit `width` and `height` on every image.
- `loading="eager"` on the LCP image only; everything else lazy.
- Reserve space for any async content so nothing reflows.

---

## Accessibility

WCAG 2.2 AA as the floor, verified per brand.

- Keyboard operable end to end, focus visible using `--color-focus`.
- Landmarks correct, heading order unbroken.
- Accessible names on all interactive elements.
- Contrast at 4.5:1 for body text and 3:1 for large text and UI, checked against **each brand's** token values. Shared components inherit different colours per brand, so a pass for one brand proves nothing about the other.
- `prefers-reduced-motion` honoured.
- Live regions for async updates like search results.

---

## CI gates

Every PR:

1. ESLint (Airbnb base) and Stylelint, zero warnings.
2. `node scripts/validate-tokens.mjs` — contract complete for all brands, no stray selectors, no literals in shared CSS.
3. Block manifest check: every block has `.js`, `.css`, a README, and a UE model.
4. Unit tests for pure logic in `scripts/lib/` via `@web/test-runner`.
5. Lighthouse CI on the preview URL, one run per brand.
6. axe-core on representative pages, one set per brand.
7. Fork-ratio report posted as a PR comment.

Pre-push hook via husky runs lint plus token validation, so the slow gates only ever fail on something the fast ones could not catch.

---

## The fork ratio

Percentage of blocks that exist in more than one brand-specific copy.

- Target: **under 15%**
- Over 20%: architecture review, not an approval

This is the health metric for the whole framework. It is the number that determines whether onboarding brand #3 takes a week or a quarter, and it only ever moves in the wrong direction quietly. Report it monthly.

---

## RUM

Keep `sampleRUM` intact and tag events with the resolved brand so Core Web Vitals can be read per brand. Field data beats lab data; a brand-blind RUM setup will average away the problem you most need to see.
