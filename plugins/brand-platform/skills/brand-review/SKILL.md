---
name: brand-review
description: Review a change in this multi-brand EDS repo against the framework. Use before opening or merging a PR.
context: fork
agent: Explore
disable-model-invocation: true
allowed-tools: Bash(git diff *) Bash(git status *) Read Glob Grep
---

## Change under review

- Diff: !`git diff HEAD`
- Files touched: !`git diff HEAD --name-only`

## Your task

This is the **multi-brand** review. Adobe's `code-review` skill covers EDS correctness;
run it first and do not duplicate its findings here. Everything below is about whether the
change holds up across brands.

Review against `.claude/skills/brand-architecture/references/review-checklist.md`, in that
order. Architecture problems are cheap to fix now and expensive later; formatting is the
reverse.

The five findings that come up most, in order:

1. A fork that should have been tokens or a variant.
2. A brand-name conditional in block code.
3. Hardcoded colours in shared CSS.
4. A new block with no Universal Editor model, so authors cannot use it.
5. Verified on one brand only.

For each finding give the file, the line, the Divergence Ladder rung it should have
landed on, and the concrete fix rather than the principle. "This should be
`--card-radius` in each brand file, which makes the `moog-cta` fork below unnecessary"
beats "avoid hardcoded values."

End with the fork ratio implied by the change and whether it moves toward or away from
the 15% target.
