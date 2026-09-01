# Tokens and Styling

## Contents
1. The three tiers
2. The contract
3. Writing shared block CSS
4. Component tokens: the fork preventer
5. Brand token files
6. Scoped brand overrides
7. Adding or changing a token
8. Fonts and icons
9. Validation

---

## 1. The three tiers

```
PRIMITIVES    shared scale, brand-independent
              --size-4  --weight-600  --duration-fast
                  ↓
SEMANTIC      THE CONTRACT. Every brand defines every name.
              --color-accent  --font-heading  --space-section
                  ↓
COMPONENT     per-block, defaults to a semantic token
              --header-height  --card-radius  --button-bg
```

Primitives live in `styles/tokens/primitives.css` and rarely change. Semantic tokens are the contract every brand must satisfy. Component tokens are declared by the block that owns them and are the escape valve that lets a brand restyle one component without forking it.

---

## 2. The contract

`styles/tokens/contract.json` lists every semantic token name every brand file must define. CI fails if a brand is missing one, which prevents the worst failure mode in multi-brand theming: a new brand silently inheriting another brand's colours because a variable fell through.

Baseline contract:

```
colour   --color-accent  --color-accent-hover  --color-accent-contrast
         --color-text  --color-text-muted  --color-text-inverse
         --color-surface  --color-surface-raised  --color-surface-inverse
         --color-border  --color-focus  --color-danger  --color-success
type     --font-heading  --font-body  --font-mono
         --font-size-xs|s|m|l|xl|2xl|3xl
         --line-height-tight|base|loose
space    --space-1|2|3|4|6|8|12|16  --space-section  --space-gutter
shape    --radius-none|s|m|l|full   --shadow-s|m|l
layout   --layout-max-width  --layout-content-width
motion   --duration-fast|base|slow  --easing-standard
brand    --brand-logo  --brand-logo-inverse  --brand-favicon
```

Names are **role-based**, not brand-prefixed. In a multi-brand system every token is brand-scoped by definition, so `--brand-primary` carries no information that `--color-accent` does not, and role names survive a rebrand better. A token named for what it *does* stays correct when the brand changes; a token named for what it *is* does not.

---

## 3. Writing shared block CSS

Every themable value is a `var()`. No hex, no `rgb()`, no `hsl()`, no font stacks, no magic pixels for anything a brand might want different.

```css
/* Wrong */
.hero h1 { color: #0b5fff; font-family: 'Moog Sans', sans-serif; border-radius: 4px; }

/* Right */
.hero h1 {
  color: var(--hero-heading-color, var(--color-text));
  font-family: var(--font-heading);
  border-radius: var(--radius-m);
}
```

Structural values that no brand would ever want to change (`display: grid`, `position: relative`, `overflow: hidden`) stay literal. The test is: would a designer ever ask for this to be different? If yes, token it.

Layout uses logical properties (`margin-inline`, `padding-block`, `inline-size`) so a right-to-left locale works without a second stylesheet.

---

## 4. Component tokens: the fork preventer

This is the highest-value pattern in the framework and the one most often missed.

A block declares its own tokens with semantic defaults:

```css
/* blocks/card/card.css */
.card {
  --card-bg: var(--color-surface-raised);
  --card-radius: var(--radius-m);
  --card-padding: var(--space-4);
  --card-border: 1px solid var(--color-border);

  background: var(--card-bg);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  border: var(--card-border);
}
```

A brand that needs a squared-off, borderless card overrides three lines in its own file:

```css
/* styles/brands/drivparts.css */
[data-brand='drivparts'] {
  --card-radius: var(--radius-none);
  --card-border: none;
  --card-bg: var(--color-surface);
}
```

No variant, no fork, no shared file touched. **Before proposing a variant or a fork, check whether three component tokens would have done it.** They usually would.

Declare component tokens at the top of the block's CSS and list them in the block README so brand teams know what they can reach for.

---

## 5. Brand token files

`styles/brands/<key>.css` contains **custom property definitions only**.

```css
:root[data-brand='moog'] {
  /* private primitives, brand-internal */
  --moog-blue-600: #0b5fff;
  --moog-blue-700: #0847c4;

  /* contract */
  --color-accent: var(--moog-blue-600);
  --color-accent-hover: var(--moog-blue-700);
  --color-accent-contrast: #fff;
  --font-heading: 'Moog Sans', system-ui, sans-serif;
  --font-body: 'Moog Text', system-ui, sans-serif;
  --radius-m: 4px;
  --layout-max-width: 1280px;
  --brand-logo: url('/icons/moog/logo.svg');
  /* ...every contract token... */

  /* component overrides, optional */
  --header-height: 72px;
}
```

Allowed in a brand file: `:root`, `[data-brand='<key>']`, `@media (prefers-color-scheme)`, `@media (prefers-reduced-motion)`, and `@font-face` for that brand.

Not allowed: any element or class selector, layout rules, block styling. A brand file containing `.cards { display: flex }` is a fork wearing a token file's clothes, and it will be found in review.

Keep it under 8 KB. It loads in the eager phase on every page.

---

## 6. Scoped brand overrides

Sometimes a brand needs a tweak too specific to deserve a token. Put it in the shared block's CSS, scoped:

```css
/* blocks/header/header.css */
[data-brand='drivparts'] .header .nav-tools { order: -1; }
```

Cap this at roughly 20% of the block's CSS. Past that, the block is telling you something: either promote the difference to a component token, or the block has genuinely diverged and belongs at L4. A block whose CSS is half brand overrides is a fork that nobody declared.

---

## 7. Adding or changing a token

Adding a token to the contract is a **breaking change for every brand**. In one PR:

1. Add the name to `styles/tokens/contract.json`.
2. Add a value to every brand file. Never leave one to inherit.
3. Update the block that needs it.
4. Run `node scripts/validate-tokens.mjs`.
5. Write an ADR if this changes the contract's shape rather than just extending it.

Renaming a token is worse than adding one. Prefer adding the new name, migrating usages, then removing the old one in a later release, so no brand is broken mid-flight.

---

## 8. Fonts and icons

Fonts are brand-scoped. A brand never downloads another brand's fonts, which means `head.html` must not preload both. Declare `@font-face` in the brand file or in a brand-scoped block of `fonts.css`, use `font-display: swap`, and match fallback metrics with `size-adjust`, `ascent-override` and `descent-override` so swapping does not move layout. Layout shift from font swap is the most common source of CLS on EDS sites.

Icons live in `icons/<key>/` for brand-specific marks and `icons/` for shared UI glyphs. `decorateIcons()` resolves them; blocks build the path from `getBrand().key` rather than hardcoding it.

---

## 9. Validation

```bash
node scripts/validate-tokens.mjs
```

Checks that every brand file defines every contract token, that brand files contain no disallowed selectors, and that shared block CSS contains no hardcoded colours or font stacks. Wire it into CI and into the pre-push hook. It is fast and it catches the errors that are otherwise invisible until a brand looks wrong in production.
