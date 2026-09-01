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
