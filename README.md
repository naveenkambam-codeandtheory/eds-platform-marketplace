# EDS Platform Marketplace

Internal Claude Code marketplace for Adobe Edge Delivery Services engineering standards.

## Install in a project

Committing this to a project's `.claude/settings.json` registers the marketplace for
everyone on clone, so nobody sets it up by hand:

```json
{
  "extraKnownMarketplaces": {
    "eds-platform": {
      "source": { "source": "github", "repo": "naveenkambam-codeandtheory/eds-platform-marketplace" }
    }
  },
  "enabledPlugins": {
    "brand-platform@eds-platform": true
  }
}
```

Team members are prompted to install when they trust the repository folder.

Or install manually:

```bash
/plugin marketplace add naveenkambam-codeandtheory/eds-platform-marketplace
/plugin install brand-platform@eds-platform
```

## Bootstrapping a new project

Skills alone aren't the whole framework — a new project also needs the validation
scripts CI runs (`scripts/`) and the framework doc the `brand-architecture` skill cites
as its authority (`docs/Multi-Brand-EDS-Framework.md`). Both live in this repo, at the
root, precisely so a new project has one real, versioned place to pull them from
instead of a local path only one machine has.

`scripts/bootstrap.mjs` automates the mechanical half of setup guide Parts 1(6-12)/2/3 —
scripts, docs, skills, `platform.json`, a starting `contract.json`, `brands.json` for
brand one, CI, and the pre-commit hook. It does **not** automate the judgment calls:
site topology, a brand's real token values, or anything content-related — those stay
prompts (required flags) or explicit "you still need to do this" warnings in its output.

```bash
git clone https://github.com/naveenkambam-codeandtheory/eds-platform-marketplace /tmp/eds-platform
cd YOUR-PROJECT   # a real aem-boilerplate clone — the script checks for this

# repoless (one site per brand):
node /tmp/eds-platform/scripts/bootstrap.mjs \
  --brand-key driv --brand-name DRiV \
  --topology repoless --hosts main--driv--your-org.aem.page,main--driv--your-org.aem.live

# path-prefix (one site, several brands under /alpha, /beta, ...):
node /tmp/eds-platform/scripts/bootstrap.mjs \
  --brand-key alpha --brand-name Alpha --topology path-prefix --path-prefix /alpha
```

Add `--dry-run` first to see what it would do without writing anything. It's safe to
re-run — existing files are skipped unless you pass `--force`, and an existing
`.husky/pre-commit` gets the gate lines prepended rather than overwritten. Run
`node /tmp/eds-platform/scripts/bootstrap.mjs --help` for the rest of the flags (org/repo
detection, `--skip-brand`, locale).

The scripts it copies are generic on purpose — they read `platform.json` for anything
project-specific, so they're never edited per project. Once the plugin above is
installed, you can also just ask Claude: "bootstrap the multi-brand scripts and
framework doc from eds-platform-marketplace" — `brand-architecture` knows to look here
when `scripts/validate-tokens.mjs` is missing.

## Why a plugin rather than only project skills

Plugin skills are namespaced as `plugin-name:skill-name`, so a developer's personal
`~/.claude/skills/eds-block/` cannot shadow the team's version. Personal skills override
project skills; they do not override plugin skills. For a standard that has to hold
across a team, that difference is the whole argument.

## Changing a skill

Skills here are shared across every EDS project in the org. Changes go through a PR to
this repo with an architecture-guild reviewer, then a version bump in both
`marketplace.json` and `plugin.json`. Bump the version even for content-only edits:
without it, clients keep the cached copy.

Consuming projects pin the version they ship in `.claude/skills.lock.json`, so an
unreviewed local edit shows up as a CI failure rather than as quiet drift.

## Validate before merging

```bash
claude plugin validate .
```
