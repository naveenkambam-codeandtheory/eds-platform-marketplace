---
name: brand-onboard
description: Onboard a new brand into this multi-brand repo, or audit a half-finished one. Use when asked to add a brand, set up brand theming, fill a brand token file, or check what is left on a brand rollout.
argument-hint: [brand-key] [--from <existing-brand>]
disable-model-invocation: true
allowed-tools: Read Glob Grep Edit Write Bash(node scripts/onboard-brand.mjs *) Bash(node scripts/validate-tokens.mjs *)
---

Onboard brand `$ARGUMENTS`.

**The test that matters: this must touch zero shared JavaScript.** If a step forces you
to edit a component, stop and report it as a framework defect. The fix is to lift the
difference into a token, a capability flag, or content, never a branch. Every branch
added during onboarding is a tax the next brand pays too.

## 1. Plan it

```bash
node scripts/onboard-brand.mjs $ARGUMENTS --dry-run
```

Show the person the plan before writing anything. If a similar brand already exists,
add `--from <that-brand>` so the capability flags, endpoint keys and authoring filters
are cloned rather than invented. Cloning is usually right: brands in one repo tend to
share a capability surface, and inventing a new shape is how registries drift.

## 2. Run it

```bash
node scripts/onboard-brand.mjs $ARGUMENTS --name "Display Name" --host example.com --from <brand>
```

The command handles every mechanical step: registry entry, token file stubbed against
the full contract, icon and font directories, content index, per-brand CI matrix entry,
and a checklist at `docs/brands/<key>.md`. It is idempotent, so re-running it after a
partial rollout only fills the gaps.

## 3. Do the parts that need judgment

The command prints these in order. The two that block everything else:

- Fill every token value from the brand's design system. Leave nothing blank; a blank
  token inherits from whichever brand loaded, which surfaces as a bug weeks later.
- Content team creates the brand's content tree and sets the brand metadata for its
  path prefix.

## 4. Verify

```bash
node scripts/onboard-brand.mjs $ARGUMENTS --check   # what is still outstanding
node scripts/validate-tokens.mjs                    # the gate
```

Then contrast against **this brand's** tokens, Lighthouse, and axe on its preview URL. A
component that passes contrast for one brand proves nothing about another, because the
colour values are different.

Report the onboarding time and anything that caused friction. That list is the
framework's remaining debt.

Full checklist: `.claude/skills/brand-architecture/references/brand-onboarding.md`.
