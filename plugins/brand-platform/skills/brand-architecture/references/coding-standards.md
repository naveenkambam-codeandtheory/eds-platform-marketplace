# Coding standards

EDS gets its speed from doing almost nothing. No framework, no bundler, no transpiler.
Every convention here protects that.

## JavaScript

- **ES modules, no build step.** Modern syntax that browsers run directly. No TypeScript
  compilation, no JSX, no polyfills for browsers we do not support.
- **ESLint, Airbnb base**, zero warnings. The boilerplate ships the config; do not loosen
  rules to make a change pass. If a rule is genuinely wrong for this project, change it in
  one PR with a reason, not with an inline disable comment.
- Inline `eslint-disable` requires a comment explaining why. An undocumented disable is a
  review finding.
- **No default exports except a block's `decorate`.** Named exports everywhere else.
- **Async by exception.** `decorate(block)` is synchronous unless it must await something
  before the block is usable.
- **No dependencies without an ADR.** Every kilobyte is on the critical path for every
  brand. The bar is high and it should feel high.
- **No secrets.** EDS repos are usually public. Endpoints come from the brand registry,
  credentials from an edge worker.
- Optional chaining and nullish coalescing over defensive `if` ladders.
- Fail soft. A block that throws takes the page with it, so guard against missing or
  unexpected authored content and degrade to something renderable.

## CSS

- **Stylelint**, zero warnings.
- **Custom properties for anything themable.** No hex, no `rgb()`, no font stacks in
  shared component CSS. Structural values that no brand would change (`display: grid`,
  `position: relative`) stay literal.
- **Component tokens declared at the top of each component's CSS**, defaulting to a
  semantic token. This is what lets a brand restyle without a fork.
- **Logical properties** for layout: `margin-inline`, `padding-block`, `inline-size`. RTL
  then costs nothing.
- **Scope to the block.** Every selector starts from the block's own class. No element
  selectors at document level, no `!important` without a comment.
- Modern CSS is fine and encouraged: nesting, `:has()`, container queries, `clamp()`.
  Check support against the project's browser matrix rather than assuming.
- Media queries use range syntax: `@media (width >= 900px)`.

## HTML and semantics

- The authored DOM carries meaning. **Transform it, do not rebuild it.** Rebuilding from
  scratch loses semantics and breaks the editor.
- One `<h1>` per page, heading order unbroken. Sections are `<section>`, navigation is
  `<nav>`, the main region is `<main>`.
- Buttons that act are `<button>`. Things that navigate are `<a>`. A `<div>` with a click
  handler is a review finding.
- Images get explicit `width` and `height`, and go through `createOptimizedPicture`.
- Icon-only controls get an accessible name.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Block | lowercase kebab, named for capability | `parts-finder` |
| Block files | folder name repeated exactly | `parts-finder/parts-finder.js` |
| Variant | lowercase kebab, authored in parentheses | `Cards (compact, dark)` |
| Semantic token | `--<role>-<name>-<modifier>` | `--color-accent-hover` |
| Component token | `--<block>-<property>` | `--header-height` |
| Brand key | lowercase alphanumeric, no hyphens | `drivparts` |
| JS variable | camelCase; booleans read as questions | `isCompact`, `hasResults` |
| CSS class | kebab, block-scoped | `.parts-finder__result` |

## Git

- **Conventional Commits**, brand in the scope where applicable:
  `fix(moog-header): correct focus order`, `feat(parts-finder): add fitment filter`.
- Branches: `<type>/<ticket>-<slug>`.
- Small PRs. One block or one concern. A PR that touches five blocks cannot be reviewed
  against the Divergence Ladder because the reviewer cannot hold five decisions at once.
- PR description states the ladder rung and lists the preview URL for **each** brand.

## Testing

- Unit tests for pure logic in `scripts/lib/` via `@web/test-runner`. Blocks themselves
  are better covered by browser validation than by unit tests over DOM transforms.
- Browser test the change on every brand. Adobe's `testing-blocks` skill drives this.
- Accessibility: axe on representative pages, per brand.
- A bug fix ships with the test that would have caught it, where the logic is testable.

## What CI enforces

Everything above that a machine can check: ESLint, Stylelint, token contract, literal
scan, fork ratio, block manifest completeness, unit tests, Lighthouse per brand, axe per
brand, and the agent-config gate. The rest is what review is for.
