#!/usr/bin/env node
/**
 * Bootstraps a new (or existing) AEM Edge Delivery Services project onto the
 * multi-brand framework: copies the canonical validation scripts, framework doc,
 * and agent skills from this marketplace repo, then scaffolds platform.json,
 * brands.json, styles/tokens/contract.json, CI, and the pre-commit hook.
 *
 * What this script does NOT do, on purpose:
 *   - decide your site topology (path-prefix vs. repoless) beyond what you tell it
 *   - invent a brand's real token values — that's steps 8-9 of the setup guide
 *   - write content, run npm install, or commit/push anything
 *   - touch a file that already has real content, unless --force is passed
 *
 * Usage:
 *   node /path/to/eds-platform-marketplace/scripts/bootstrap.mjs [options]
 *   (run from inside the target project; --target overrides the cwd)
 *
 * Options:
 *   --target <dir>         Project to bootstrap. Default: cwd.
 *   --brand-key <key>      Lowercase alphanumeric, e.g. "driv". Required unless --skip-brand.
 *   --brand-name <name>    Human-readable name, e.g. "DRiV". Required unless --skip-brand.
 *   --topology <t>         "path-prefix" or "repoless". Required unless --skip-brand.
 *   --path-prefix <p>      Required when --topology path-prefix, e.g. "/driv".
 *   --hosts <a,b>          Required when --topology repoless: comma-separated hostnames.
 *   --locale <l>           Default: en-us.
 *   --org <org>            GitHub org/user, for CI URLs and settings.json. Auto-detected
 *                          from `git remote` when omitted.
 *   --repo <name>          Repo name, for CI URLs. Auto-detected when omitted.
 *   --skip-brand           Scaffold platform.json/contract.json only; skip brands.json.
 *   --force                Overwrite files that already exist (default: skip them).
 *   --dry-run              Print what would happen without writing anything.
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const MARKETPLACE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = { locale: 'en-us' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (['skip-brand', 'force', 'dry-run', 'help'].includes(key)) {
      args[key] = true;
    } else {
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || process.argv.includes('-h')) {
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('/**') || l.startsWith(' *') || l.startsWith('*/'))
    .map((l) => l.replace(/^\s*\*\/?\s?/, ''))
    .join('\n');
  console.log(header.trim());
  process.exit(0);
}

const TARGET = args.target ? join(process.cwd(), args.target) : process.cwd();
const DRY = Boolean(args['dry-run']);
const FORCE = Boolean(args.force);

function log(msg) { console.log(msg); }
function warn(msg) { console.log(`  warn  ${msg}`); }
function done(msg) { console.log(`  ok    ${msg}`); }
function skip(msg) { console.log(`  skip  ${msg}`); }
function fail(msg) { console.error(`\nERROR: ${msg}`); process.exit(1); }

/* --------------------------------------------- 0. sanity check the target */

const required = ['blocks', 'scripts/aem.js', 'styles/styles.css', 'head.html'];
const missing = required.filter((p) => !existsSync(join(TARGET, p)));
if (missing.length) {
  fail(
    `${TARGET} doesn't look like an EDS project (missing ${missing.join(', ')}).\n`
    + 'Run this from inside a real aem-boilerplate-derived repo, or pass --target.',
  );
}

/* --------------------------------------------- helpers */

function copyFile(src, destRel) {
  const dest = join(TARGET, destRel);
  if (existsSync(dest) && !FORCE) { skip(`${destRel} (exists, use --force to overwrite)`); return; }
  if (DRY) { log(`  would copy  ${destRel}`); return; }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  done(destRel);
}

function copyDir(srcDir, destRelDir) {
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destRel = join(destRelDir, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destRel);
    } else {
      copyFile(srcPath, destRel);
    }
  }
}

function writeJSON(destRel, obj) {
  const dest = join(TARGET, destRel);
  if (existsSync(dest) && !FORCE) { skip(`${destRel} (exists, use --force to overwrite)`); return; }
  if (DRY) { log(`  would write  ${destRel}`); return; }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(obj, null, 2)}\n`);
  done(destRel);
}

function detectGitRemote() {
  try {
    const url = execSync('git remote get-url origin', { cwd: TARGET, stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
    const m = url.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
    if (m) return { org: m[1], repo: m[2] };
  } catch { /* not a git repo, or no origin — that's fine */ }
  return {};
}

const detected = detectGitRemote();
const ORG = args.org ?? detected.org ?? 'YOUR-ORG';
const REPO = args.repo ?? detected.repo ?? basename(TARGET);

log(`Bootstrapping ${TARGET}`);
log(`  marketplace source: ${MARKETPLACE_ROOT}`);
log(`  org/repo for CI/settings: ${ORG}/${REPO}${detected.org ? ' (detected from git remote)' : ' (default — pass --org/--repo to override)'}`);
if (DRY) log('  --dry-run: nothing will actually be written\n'); else log('');

/* --------------------------------------------- 1. canonical scripts + framework doc */

log('Scripts and framework doc (step 19):');
for (const f of ['validate-tokens.mjs', 'validate-skills.mjs', 'onboard-brand.mjs']) {
  copyFile(join(MARKETPLACE_ROOT, 'scripts', f), join('scripts', f));
}
for (const f of readdirSync(join(MARKETPLACE_ROOT, 'docs'))) {
  copyFile(join(MARKETPLACE_ROOT, 'docs', f), join('docs', f));
}

/* --------------------------------------------- 2. committed project skills */

log('\nProject skills (step 14):');
copyDir(join(MARKETPLACE_ROOT, 'plugins/brand-platform/skills'), '.claude/skills');

/* --------------------------------------------- 3. .claude/settings.json (step 15) */

log('\nAgent settings (step 15):');
writeJSON('.claude/settings.json', {
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  extraKnownMarketplaces: {
    'adobe-skills': { source: { source: 'github', repo: 'adobe/skills' } },
    'eds-platform': { source: { source: 'github', repo: 'naveenkambam-codeandtheory/eds-platform-marketplace' } },
  },
  enabledPlugins: {
    'aem-edge-delivery-services@adobe-skills': true,
    'brand-platform@eds-platform': true,
  },
  permissions: {
    deny: ['Edit(scripts/aem.js)', 'Write(scripts/aem.js)'],
  },
});

/* --------------------------------------------- 4. platform.json (step 6) */

log('\nplatform.json (step 6):');
writeJSON('platform.json', {
  platform: 'aem-eds',
  conventions: {
    forkPrefix: '{brandKey}-',
    brandAttribute: 'data-brand',
    allowedLiteralColors: ['#fff', '#000'],
  },
  budgets: { forkRatioTarget: 15, forkRatioMax: 20, brandTokenFileKb: 8 },
});

/* --------------------------------------------- 5. token contract baseline (step 8) */

log('\nToken contract (step 8):');
writeJSON('styles/tokens/contract.json', {
  version: 1,
  tokens: {
    colour: ['--color-accent', '--color-accent-hover', '--color-accent-contrast',
      '--color-text', '--color-text-muted', '--color-text-inverse',
      '--color-surface', '--color-surface-raised', '--color-surface-inverse',
      '--color-border', '--color-focus', '--color-danger', '--color-success'],
    type: ['--font-heading', '--font-body', '--font-mono',
      '--font-size-xs', '--font-size-s', '--font-size-m', '--font-size-l',
      '--font-size-xl', '--font-size-2xl', '--font-size-3xl',
      '--line-height-tight', '--line-height-base', '--line-height-loose'],
    space: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6',
      '--space-8', '--space-12', '--space-16', '--space-section', '--space-gutter'],
    shape: ['--radius-none', '--radius-s', '--radius-m', '--radius-l', '--radius-full',
      '--shadow-s', '--shadow-m', '--shadow-l'],
    layout: ['--layout-max-width', '--layout-content-width'],
    motion: ['--duration-fast', '--duration-base', '--duration-slow', '--easing-standard'],
    brand: ['--brand-logo', '--brand-logo-inverse', '--brand-favicon'],
  },
});
warn('This is the baseline contract, not a finished one — verify against the brand\'s real');
warn('design before treating any value as final, and split a token in two (see step 8 of');
warn('the setup guide) if real data shows one name serving two distinct roles.');

/* --------------------------------------------- 6. first brand (step 7) */

if (!args['skip-brand']) {
  if (!args['brand-key'] || !args['brand-name'] || !args.topology) {
    fail('Provide --brand-key, --brand-name and --topology (or pass --skip-brand to scaffold\n'
      + 'platform.json/contract.json only, and add brands.json yourself later).');
  }
  if (!/^[a-z0-9]+$/.test(args['brand-key'])) {
    fail(`--brand-key "${args['brand-key']}" must be lowercase alphanumeric, no hyphens.`);
  }
  if (args.topology === 'path-prefix' && !args['path-prefix']) {
    fail('--topology path-prefix requires --path-prefix, e.g. --path-prefix /driv');
  }
  if (args.topology === 'repoless' && !args.hosts) {
    fail('--topology repoless requires --hosts, e.g. --hosts main--driv--org.aem.page,main--driv--org.aem.live');
  }

  const key = args['brand-key'];
  const pathPrefix = args.topology === 'repoless' ? '/' : args['path-prefix'];
  const hosts = args.topology === 'repoless' ? args.hosts.split(',').map((h) => h.trim()) : [];
  const indexPath = args.topology === 'repoless' ? '/query-index.json' : `${pathPrefix}/query-index.json`;

  log(`\nBrand registry for "${key}" (step 7):`);
  writeJSON('brands.json', {
    default: key,
    brands: {
      [key]: {
        key,
        name: args['brand-name'],
        pathPrefix,
        hosts,
        locales: [args.locale],
        indexPath,
        features: {},
        endpoints: {},
      },
    },
  });

  if (args.topology === 'repoless' && hosts.length === 0) {
    warn('No real hostnames yet — hosts is empty. Fill these in once the site exists in the');
    warn('Configuration Service, or brand resolution has nothing to match against.');
  }
}

/* --------------------------------------------- 7. CI + pre-commit (step 20) */

log('\nCI workflow (step 20):');
const topology = args.topology ?? 'path-prefix';
const brandKey = args['brand-key'] ?? 'alpha';
const previewUrl = topology === 'repoless'
  ? `https://\${{ github.head_ref }}--${brandKey}--${ORG}.aem.page/`
  : `https://\${{ github.head_ref }}--${REPO}--${ORG}.aem.page/${brandKey}/`;

const workflow = `name: Quality gates

on:
  pull_request:
    branches: [main]

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx eslint . --max-warnings 0
      - run: npx stylelint "**/*.css" --max-warnings 0
      - run: node scripts/validate-tokens.mjs
      - run: node scripts/validate-skills.mjs

  budgets:
    runs-on: ubuntu-latest
    needs: static
    strategy:
      fail-fast: false
      matrix:
        # onboard-brand.mjs appends new brands here
        brand: [${brandKey}]
    steps:
      - uses: actions/checkout@v4
      - name: Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: ${previewUrl}
          uploadArtifacts: true
      - name: axe
        run: npx @axe-core/cli "${previewUrl}" --exit
`;

const workflowDest = join(TARGET, '.github/workflows/quality-gates.yml');
if (existsSync(workflowDest) && !FORCE) {
  skip('.github/workflows/quality-gates.yml (exists, use --force to overwrite)');
} else if (DRY) {
  log('  would write  .github/workflows/quality-gates.yml');
} else {
  mkdirSync(dirname(workflowDest), { recursive: true });
  writeFileSync(workflowDest, workflow);
  done('.github/workflows/quality-gates.yml');
}
if (topology === 'repoless') {
  warn('Repoless CI matrix has one brand with a URL formula assuming the brand key is also');
  warn('the repo name (true for brand 1, not guaranteed for brand 2+). Add an explicit');
  warn('`include:` entry per additional repoless brand — see step 20 of the setup guide.');
}

log('\nPre-commit hook (step 20):');
const preCommitDest = join(TARGET, '.husky/pre-commit');
const gateLines = 'npm run lint\nnode scripts/validate-skills.mjs --quiet\nnode scripts/validate-tokens.mjs --quiet\n';
if (existsSync(preCommitDest)) {
  const existing = readFileSync(preCommitDest, 'utf8');
  if (existing.includes('validate-tokens.mjs')) {
    skip('.husky/pre-commit (gate lines already present)');
  } else if (DRY) {
    log('  would prepend gate lines to existing .husky/pre-commit (not overwriting it)');
  } else {
    writeFileSync(preCommitDest, gateLines + existing);
    done('.husky/pre-commit (prepended — existing hook content kept, not replaced)');
  }
} else if (DRY) {
  log('  would write  .husky/pre-commit');
} else {
  mkdirSync(dirname(preCommitDest), { recursive: true });
  writeFileSync(preCommitDest, `#!/usr/bin/env sh\n${gateLines}`);
  done('.husky/pre-commit');
}

/* --------------------------------------------- summary */

log('\nDone. What this script could not do for you:');
log('  - install marketplace plugins (/plugin marketplace add, /plugin install — interactive)');
log('  - fill in real brand token values (colours, fonts, sizes) — verify against production');
log('  - decide anything about content, site config, or Configuration Service setup');
log('  - run npm install / npm run lint / git add+commit — check the output above, then do that yourself');
