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
instead of a local path only one machine has:

```bash
git clone https://github.com/naveenkambam-codeandtheory/eds-platform-marketplace /tmp/eds-platform
cp /tmp/eds-platform/scripts/*.mjs   YOUR-PROJECT/scripts/
cp /tmp/eds-platform/docs/*.md       YOUR-PROJECT/docs/
```

These scripts are generic on purpose — they read `platform.json` for anything
project-specific, so they're never edited per project. Once the plugin above is
installed, you can also just ask Claude: "bootstrap the multi-brand scripts and
framework doc from eds-platform-marketplace" — `brand-architecture` knows to look here
when `scripts/validate-tokens.mjs` is missing.

CI workflow and pre-commit hook templates are also here, as skill assets
(`plugins/brand-platform/skills/brand-architecture/assets/ci-quality-gates.example.yml`)
once the plugin is installed — adapt the brand matrix and preview-URL pattern to your
project's site topology (path-prefix vs. repoless) before using it.

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
