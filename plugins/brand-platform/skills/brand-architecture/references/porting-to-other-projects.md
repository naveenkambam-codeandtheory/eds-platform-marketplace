# Porting this framework to another project

Three layers, with very different portability. Be honest about which is which before
reusing any of it, because copying the EDS-specific parts into a React project is how a
framework gets a reputation for being cargo cult.

| Layer | Portability | What it is |
|---|---|---|
| **Architecture principles** | Any multi-brand front end | Brand-as-data, the Divergence Ladder, the token contract, the fork ratio, component tokens |
| **Tooling and enforcement** | Any repo, any stack | `platform.json`, `validate-tokens.mjs`, `onboard-brand.mjs`, `validate-skills.mjs`, the skills, the CI gates |
| **Implementation details** | Adobe EDS only | `aem.js`, `decorate(block)`, eager/lazy/delayed phases, `helix-query.yaml`, block variants in parentheses, Universal Editor JSON |

The first two layers are the reusable framework. The third is this project's expression
of it.

---

## What transfers unchanged

**The Divergence Ladder.** L0 content → L1 tokens → L2 variant → L3 config → L4 fork.
Only the vocabulary changes. On a React codebase, L2 is a prop or a CSS-module modifier
rather than an authored class in parentheses; L3 is the same capability check; L4 is
still a brand-scoped subfolder inside the component (`Header/moog/Header.moog.tsx`, say)
with an ADR attached, dynamically loaded by the shared component — never a sibling
component under a new name. The point that carries across stacks: the fork is reached
by path, not by renaming the thing authors and other code refer to.

**The token contract.** Three tiers with the middle tier fixed, enforced in CI. This is
stack-independent because it is really a rule about names, not about CSS.

**Component tokens as the fork preventer.** The single highest-value pattern here, and it
works anywhere CSS custom properties do.

**The fork ratio.** Under 15%, architecture review over 20%. It is the metric that
decides whether brand #3 takes a week or a quarter, and it applies to any codebase where
one team serves several brands.

**Brand-as-data with a registry.** `brands.json` plus a resolution function. Resolution
differs by stack (metadata and path on EDS; middleware, subdomain routing, or build-time
config elsewhere), but the registry shape and the rule that components ask the platform
rather than deriving the brand themselves do not.

**The enforcement layers.** Committed skills, path scoping, a plugin from an internal
marketplace, and a CI gate. Nothing in `validate-skills.mjs` knows what EDS is.

---

## What you retarget

Everything the tooling needs to know about a project's shape lives in `platform.json`:

```json
{
  "platform": "aem-eds",
  "paths": {
    "components": "blocks",
    "brandTokens": "styles/brands",
    "tokenContract": "styles/tokens/contract.json",
    "registry": "brands.json",
    "icons": "icons",
    "fonts": "fonts",
    "queryConfig": "helix-query.yaml",
    "authoringFilters": "component-filters.json",
    "ciWorkflow": ".github/workflows/quality-gates.yml",
    "docs": "docs/brands"
  },
  "conventions": {
    "forkSubdir": "{brandKey}",
    "brandAttribute": "data-brand",
    "allowedLiteralColors": ["#fff", "#000"]
  },
  "budgets": { "forkRatioTarget": 15, "forkRatioMax": 20, "brandTokenFileKb": 8 }
}
```

For a Next.js multi-brand app the same tooling runs against:

```json
{
  "platform": "nextjs",
  "paths": {
    "components": "src/components",
    "brandTokens": "src/styles/brands",
    "tokenContract": "src/styles/tokens/contract.json",
    "registry": "brands.config.json",
    "ciWorkflow": ".github/workflows/ci.yml"
  },
  "conventions": { "forkSubdir": "{brandKey}", "brandAttribute": "data-brand" }
}
```

`validate-tokens.mjs` and `onboard-brand.mjs` read this and adapt. Steps whose target
file does not exist are reported as manual TODOs rather than failing, so a project that
has no `helix-query.yaml` simply gets a prompt in the checklist instead of an error.

---

## Checklist for a new project

1. Copy `.claude/`, `scripts/`, `platform.json`, the CI workflow, and the framework doc.
2. Rewrite `platform.json` for the new layout.
3. Rewrite `styles/tokens/contract.json` for the new design system. The names are a
   project decision; the rule that every brand defines all of them is not.
4. Register the plugin marketplace in `.claude/settings.json`.
5. Rewrite the **implementation** sections of the skill: `references/block-development.md`
   is almost entirely EDS-specific and needs replacing with the new stack's component
   pattern. `references/tokens-and-styling.md` and `references/review-checklist.md`
   mostly survive with terminology edits.
6. Replace the performance budgets with ones that suit the stack. Lighthouse 100 is
   realistic on EDS and usually is not on a heavy SPA; a budget nobody can hit gets
   ignored, which is worse than a looser one that holds.
7. Run `node scripts/validate-skills.mjs --update-lock` and commit the lockfile.
8. Onboard a throwaway brand with `--dry-run` to confirm the wiring before real work.

---

## What does not transfer, and why it matters

EDS gets three things nearly free that other stacks do not, so a port has to solve them
deliberately rather than assume them:

- **Content-driven brand switching.** Header and footer read a metadata-supplied path,
  which is why forking them is unnecessary here. Elsewhere you build that indirection.
- **Zero-build component loading.** Blocks are plain modules loaded on demand. A bundler
  changes the fork calculus, because a fork may cost bundle size on every brand rather
  than only on the brand that uses it.
- **The three-phase loading model.** Eager, lazy, delayed. Other stacks have equivalents,
  but the rule "all third-party in delayed" needs restating in that stack's terms or it
  will not be followed.
