# Working with Adobe's official EDS skills

Adobe publishes an agent-skills catalog at `github.com/adobe/skills`. Install it. Our
skills are a thin layer on top, not a replacement, and the division of labour has to stay
sharp or the two will give conflicting advice on the same question.

## Install

```
/plugin marketplace add adobe/skills
/plugin install aem-edge-delivery-services@adobe-skills
```

Optional, useful on this programme:

```
/plugin install aem-design@adobe-skills          # brand profile, briefings, prototypes
/plugin install aem-project-management@adobe-skills   # authoring/dev/admin handover docs
```

Both marketplaces are declared in `.claude/settings.json`, so a fresh clone is prompted to
install them on folder trust rather than relying on each developer's setup.

## Division of labour

| Question | Skill |
|---|---|
| How do I write a block? | Adobe `building-blocks` |
| How do I run the full change workflow? | Adobe `content-driven-development` |
| What should the content model look like? | Adobe `content-modeling` |
| Does a block already exist for this? | Adobe `block-inventory`, `block-collection-and-party` |
| How do I test it in a browser? | Adobe `testing-blocks` |
| What does the EDS docs say about X? | Adobe `docs-search` |
| Is this EDS code correct? | Adobe `code-review` |
| How do I run the local dev server? | Adobe `aem-cli` |
| **Should this differ per brand, and how?** | **`brand-architecture`** |
| **Where does this land on the Divergence Ladder?** | **`brand-architecture`** |
| **How do I name and scope a block across brands?** | **`brand-block`** |
| **How do I add a brand?** | **`brand-onboard`** |
| **Does this change hold up across all brands?** | **`brand-review`** |

The rule of thumb: **Adobe owns how EDS works, we own how this repo serves several
brands.** If a question would have the same answer on a single-brand EDS site, it is
Adobe's. If the answer changes because there are two brands, it is ours.

## Why our skills are named `brand-*`

Not `eds-*`. Three reasons, and they are worth preserving if you add skills later:

1. **No name collision.** Adobe's plugin already has `code-review`, `building-blocks`,
   `content-modeling`. An `eds-review` sitting next to `code-review` is ambiguous to a
   model choosing between them; `brand-review` is not.
2. **The name states the concern.** A developer reading `/brand-onboard` knows it is about
   brands. `/eds-brand` reads like it is about EDS.
3. **Plugin namespacing protects both.** Ours resolve as `brand-platform:brand-review`,
   Adobe's as `aem-edge-delivery-services:code-review`. Neither can shadow the other, and
   neither can be shadowed by someone's personal skill.

Avoid the bare name `brand`: Adobe's `aem-design` plugin already uses it for brand-profile
extraction.

## Chaining them

A typical block change runs both layers:

1. `brand-architecture` — which Divergence Ladder rung does this land on? Stop here if the
   answer is tokens or content, because then there is no block change at all.
2. Adobe `block-inventory` — does something already exist?
3. Adobe `building-blocks` — implement it.
4. `brand-block` — capability naming, brand-safe patterns, per-brand verification.
5. Adobe `testing-blocks` — browser validation.
6. Adobe `code-review` then `brand-review` — EDS correctness, then multi-brand correctness.

The ordering matters at step 1. Running the architecture check first is what stops the
team from implementing a beautifully correct block that should never have existed.

## Keeping agents on the right documentation

Tell the agent to **search www.aem.live**. Left unconstrained, "EDS" returns medical
results for Ehlers-Danlos syndrome or CDN edge-compute products from other vendors, and
"AEM" returns the Java/JCR/OSGi stack that has nothing to do with this one. Adobe also
publishes `https://www.aem.live/llms.txt`, an index of the documentation formatted for AI
consumption; naming it in a prompt pulls the right pages into context quickly.

This instruction lives in `AGENTS.md` so every agent picks it up, not only Claude.

## MCP servers worth adding

| Server | Status | Use |
|---|---|---|
| Context7 | third-party | Indexed API documentation including aem.live |
| Helix MCP | community, unofficial | Docs search, block starters, admin tools |
| DA MCP | community, unofficial | Document Authoring content operations |
| Browser MCP / Playwright | third-party | Lets the agent see the rendered page |

MCP tools consume context on every turn, so enable what you use and turn off the rest.
`/context` shows the cost. The browser one earns its place fastest: without it the agent
is guessing what the page looks like.
