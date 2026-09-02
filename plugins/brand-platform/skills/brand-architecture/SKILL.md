---
name: brand-architecture
description: Multi-brand conventions for this Adobe Edge Delivery Services repo. Pairs with Adobe's official aem-edge-delivery-services skills, which own EDS mechanics; this one owns what differs per brand. One repo serves several brands; a brand is data (tokens, content, config), not code. Use whenever the work touches blocks/, scripts/scripts.js, scripts/brand.js, styles/brands/*.css, brands.json, design tokens, block variants, head.html, or the Universal Editor component JSON — and whenever someone asks to add a block, fork a block per brand, theme the site, onboard a brand, or debug Core Web Vitals here. Apply it even when the request sounds like ordinary front-end work ("add a hero", "make the header different for DRiV", "why is LCP bad"), because the conventions here differ from normal web development and getting them wrong is expensive to undo.
when_to_use: Any change under blocks/, styles/, or scripts/ in this repository. Also for PR review, brand onboarding, and any question about whether something should be forked per brand.
paths:
  - blocks/**
  - styles/**
  - scripts/**
  - brands.json
  - component-*.json
  - head.html
metadata:
  framework-version: "1.0"
  owner: eds-architecture-guild
---

# Multi-Brand EDS conventions

Authority: `docs/Multi-Brand-EDS-Framework.md`. This skill is its enforcement arm.

## Bootstrapping a new project

If `scripts/validate-tokens.mjs`, `scripts/validate-skills.mjs`, `scripts/onboard-brand.mjs`,
or `docs/Multi-Brand-EDS-Framework.md` are missing from the current project, don't wait to
be handed them from an unspecified local path — they live, versioned, at the root of
`github.com/naveenkambam-codeandtheory/eds-platform-marketplace` (this plugin's own
repository). Clone it and copy `scripts/*.mjs` into this project's `scripts/`, and
`docs/*.md` into this project's `docs/`. They're generic (everything project-specific
comes from `platform.json`), so copy them as-is rather than adapting them.

## What this skill does not do

Adobe's official `aem-edge-delivery-services` skills own **how EDS works**: block
mechanics (`building-blocks`), the change workflow (`content-driven-development`), content
models (`content-modeling`), browser testing (`testing-blocks`), reference blocks
(`block-inventory`, `block-collection-and-party`), docs (`docs-search`), EDS correctness
(`code-review`), and the local server (`aem-cli`). Use them. Do not reimplement them here.

This skill owns **what differs per brand**. The test: if the answer would be the same on a
single-brand EDS site, it is Adobe's question. If having two brands changes the answer, it
is this one.

When looking anything up, **search www.aem.live**. Unconstrained, "EDS" returns medical
results and "AEM" returns the Java stack. See `references/adobe-skills-integration.md`.

**One idea governs everything: a brand is data, not code.** The health metric is the
fork ratio, the share of blocks existing in more than one brand-specific copy. Target
under 15%. It decides whether the next brand takes a week or a quarter.

## Before writing anything

1. Read `brands.json` for which brands exist, their prefixes, locales, feature flags.
2. Read `styles/tokens/contract.json` and one file under `styles/brands/`.
3. `ls blocks/`. Extending an existing block beats a near-duplicate.
4. Identify the Divergence Ladder rung before writing code.

## The Divergence Ladder

Start at L0, stop at the first rung that works, never skip rungs, name the rung in the PR.

| Rung | Mechanism | Use when |
|---|---|---|
| L0 | Different content, fragment, or sheet | Same markup shape, different words/images/links |
| L1 | Token values, including component tokens | Colour, type, spacing, radius, elevation, logo |
| L2 | Variant, `Cards (compact)` gives `.cards.compact` | Layout or density differs, behaviour identical |
| L3 | `hasFeature()` / `getBrandConfig()` branch | Behaviour differs by named capability |
| L4 | Fork into a brand subfolder, `<block>/<brand>/<brand>.js` | Structure and behaviour fundamentally differ |

L4 needs all four: more than 40% of the JS differs, the difference is structural not
visual, L0 to L3 were genuinely attempted, and an ADR is linked in a header comment in
the fork file (`<block>/<brand>/<brand>.js`), not the shared one. The block keeps its
name, its README, and its Universal Editor model — only the diverging brand pays for
the fork.

Most requests that sound like L4 are L0 plus L2. When someone asks for a fork, walk the
ladder out loud and show what L0 to L3 would look like before agreeing. That conversation
is the point of this skill.

## Non-negotiables

- Never modify `scripts/aem.js`. Extend in `scripts/lib/`.
- Never write `if (brand === 'moog')`. Use `hasFeature('partsFinder')`.
- Never put a colour, font stack, or themable pixel value in shared block CSS.
- Never reference a brand asset by literal path. Build it from `getBrand().key`.
- Never put a selector in a brand token file. Custom properties only.
- Never load a third-party script outside `delayed.js`.
- Never ship a block without its Universal Editor model and filter entry.
- Never verify on one brand.

## Component tokens prevent most forks

```css
.card {
  --card-bg: var(--color-surface-raised);
  --card-radius: var(--radius-m);
  background: var(--card-bg);
  border-radius: var(--card-radius);
}
```

A brand overrides `--card-radius` in its own file. No variant, no fork, no shared file
touched. Check whether three component tokens would have done it before proposing
anything above L1.

## Commands

```bash
node scripts/onboard-brand.mjs <key> --dry-run   # plan a new brand
node scripts/onboard-brand.mjs <key> --check     # what is outstanding on a brand
node scripts/validate-tokens.mjs                 # contract, literals, fork ratio
```

`platform.json` holds the project's shape (where components, tokens and the registry
live). The scripts read it rather than hardcoding paths, so the same tooling works on a
repo laid out differently. Update it, not the scripts.

## Before pushing

```bash
node scripts/validate-tokens.mjs && npm run lint
```

## Reference files

- `references/block-development.md` — block anatomy, brand-aware patterns, worked example
- `references/tokens-and-styling.md` — three tiers, the contract, adding tokens
- `references/brand-onboarding.md` — the new-brand checklist
- `references/review-checklist.md` — PR review, ordered by what actually goes wrong
- `references/performance-and-quality.md` — budgets, phases, a11y, CI gates
- `references/porting-to-other-projects.md` — which layers are stack-agnostic, and how to retarget them
- `references/adobe-skills-integration.md` — division of labour with Adobe's official skills
- `references/coding-standards.md` — JS, CSS, HTML, naming, git, testing
