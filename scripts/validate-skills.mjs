#!/usr/bin/env node
/**
 * Agent-config enforcement gate.
 *
 * A skill is guidance, not a gate. A developer can delete it, edit it, or silence it
 * with skillOverrides in settings.local.json. This script is the backstop: it runs in CI
 * and in the pre-commit hook, where nobody's local configuration can reach it.
 *
 * It checks that:
 *   1. every required skill is present
 *   2. each SKILL.md has parseable frontmatter with a name and a description
 *   3. the pinned skills have not drifted from the version the guild approved
 *   4. settings.json still declares the marketplace and plugin
 *
 * Drift is a warning on a feature branch and a failure on main, because a local edit to
 * a shared skill is usually someone solving their own problem in everyone's file.
 *
 * Usage: node scripts/validate-skills.mjs [--update-lock] [--quiet]
 * Exit:  0 clean, 1 violations.
 */

import {
  readFileSync, writeFileSync, existsSync, readdirSync, statSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const UPDATE = args.includes('--update-lock');

const SKILLS_DIR = join(ROOT, '.claude/skills');
const SETTINGS = join(ROOT, '.claude/settings.json');
const LOCK = join(ROOT, '.claude/skills.lock.json');

// Edit this list when the guild adds a skill. Adding one here without committing it
// fails the build, which is the point.
const REQUIRED = ['brand-architecture', 'brand-block', 'brand-onboard', 'brand-review'];
const REQUIRED_PLUGINS = ['brand-platform@eds-platform', 'aem-edge-delivery-services@adobe-skills'];

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const onMain = (process.env.GITHUB_REF ?? '').endsWith('/main')
  || process.env.GITHUB_BASE_REF === 'main';

/* --------------------------------------------------------------- helpers */

/** Hash every file in a directory tree, so a change anywhere in the skill is visible. */
function hashTree(dir) {
  const files = [];
  (function walk(d) {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  }(dir));

  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(dir, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}

/** Minimal frontmatter read. Full validation is `claude plugin validate`, run in CI. */
function frontmatter(path) {
  const text = readFileSync(path, 'utf8');
  if (!text.startsWith('---')) return null; // Claude Code only parses a leading ---
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(3, end);
  const get = (key) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  return { name: get('name'), description: get('description') };
}

/* --------------------------------------------------------------- checks */

if (!existsSync(SKILLS_DIR)) {
  console.error('.claude/skills/ is missing. The agent configuration is part of the repo, not a personal setup step.');
  process.exit(1);
}

const lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : { skills: {} };
const nextLock = { version: 1, skills: {} };

for (const name of REQUIRED) {
  const dir = join(SKILLS_DIR, name);

  if (!existsSync(dir)) {
    fail(`missing required skill: .claude/skills/${name}/`);
    continue;
  }

  const skillMd = join(dir, 'SKILL.md');
  if (!existsSync(skillMd)) {
    fail(`.claude/skills/${name}/ has no SKILL.md`);
    continue;
  }

  const fm = frontmatter(skillMd);
  if (!fm) {
    // Claude Code reads frontmatter only when the opening --- is the first line.
    // Otherwise the whole file, markers included, is treated as skill content.
    fail(`${name}: frontmatter did not parse — the opening --- must be the first line`);
  } else {
    if (!fm.name) warn(`${name}: no name field (falls back to the directory name)`);
    if (!fm.description) fail(`${name}: no description — Claude cannot decide when to load it`);
  }

  const hash = hashTree(dir);
  nextLock.skills[name] = hash;

  const pinned = lock.skills?.[name];
  if (pinned && pinned !== hash) {
    const msg = `${name}: content differs from the pinned version (${pinned} → ${hash}). `
      + 'Shared skills change through a PR to the platform marketplace, not a local edit. '
      + 'If this change is intended, run: node scripts/validate-skills.mjs --update-lock';
    if (onMain) fail(msg); else warn(msg);
  } else if (!pinned) {
    warn(`${name}: not yet pinned. Run with --update-lock to record the approved version.`);
  }
}

/* Settings must still declare the marketplace and plugin, otherwise a fresh clone or a
   cloud session silently runs without them. */
if (!existsSync(SETTINGS)) {
  fail('.claude/settings.json is missing — the marketplace and plugin would not install on clone');
} else {
  const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  if (!settings.extraKnownMarketplaces) {
    fail('.claude/settings.json: no extraKnownMarketplaces entry');
  }
  for (const p of REQUIRED_PLUGINS) {
    if (settings.enabledPlugins?.[p] !== true) {
      warn(`.claude/settings.json: ${p} is not enabled at project scope`);
    }
  }
}

/* --------------------------------------------------------------- report */

if (UPDATE) {
  writeFileSync(LOCK, `${JSON.stringify(nextLock, null, 2)}\n`);
  console.log(`Pinned ${Object.keys(nextLock.skills).length} skill(s) in .claude/skills.lock.json`);
}

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  FAIL  ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} violation(s). See docs/Enforcing-EDS-Skills.md.`);
  process.exit(1);
}
if (!QUIET) console.log(`Agent config OK: ${REQUIRED.length} skills present and pinned.`);
