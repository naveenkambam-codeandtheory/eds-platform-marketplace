---
name: brand-block
description: Scaffold a new block in this multi-brand EDS repo, or refactor an existing one down the Divergence Ladder. Use when asked to add, create, extend, or de-fork a block.
argument-hint: [block-name]
disable-model-invocation: true
allowed-tools: Read Glob Grep Edit Write
---

Create or refactor the block `$ARGUMENTS`.

## 1. Check it should exist

- `ls blocks/` first. If a block already covers this capability, extend it.
- Name by capability, never by brand. `parts-finder`, not `drivparts-parts-finder`.
  An owner-named block has to be renamed the day a second brand wants it, and renaming
  breaks every authored page that references it.
- If the request is for a brand-specific fork, walk the Divergence Ladder in
  `brand-architecture` and report which rung actually applies before writing anything.

## 2. Scaffold

Copy `.claude/skills/brand-architecture/assets/block-template/` to `blocks/$ARGUMENTS/`,
renaming `example.js` and `example.css` to match the folder exactly. The EDS loader
derives paths from the block name, so a mismatch fails silently.

## 3. Write it

Use Adobe's `building-blocks` skill for the implementation itself — DOM patterns, the
decorate contract, EDS idioms. This skill covers only what changes because the repo serves
several brands:

- `export default function decorate(block)`, transforming the authored DOM in place.
- Variants from `block.classList`, never from DOM shape.
- Brand from `getBrand()` / `hasFeature()`, never from `window.location` or a brand name.
- Strings from `fetchPlaceholders(getBrand().pathPrefix)`.
- Component tokens declared at the top of the CSS with semantic defaults.
- Guard against empty and unexpected authored content.

## 4. Finish the job

A block is not done without all of these:

- [ ] `blocks/$ARGUMENTS/$ARGUMENTS.js` and `.css`
- [ ] `README.md` covering authoring shape, variants, component tokens, fork status
- [ ] entries in `component-definition.json`, `component-models.json`, `component-filters.json`
- [ ] `node scripts/validate-tokens.mjs` passes
- [ ] rendered and checked on every brand in `brands.json`

Details: `.claude/skills/brand-architecture/references/block-development.md`.
Division of labour with Adobe's skills:
`.claude/skills/brand-architecture/references/adobe-skills-integration.md`.
