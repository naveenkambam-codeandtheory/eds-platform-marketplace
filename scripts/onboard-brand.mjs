#!/usr/bin/env node
/**
 * One-command brand onboarding.
 *
 * Does every mechanical step of adding a brand, so the only work left is the part that
 * needs judgment: filling token values from the design system and creating content.
 * Everything it writes lives in the brand layer. It never edits shared JavaScript, and
 * if a project ever needs it to, that is a framework defect rather than a missing flag.
 *
 * Usage:
 *   node scripts/onboard-brand.mjs <key> [options]
 *
 * Options:
 *   --name "Brand Three"     display name            (default: capitalised key)
 *   --prefix /brandthree     content path prefix     (default: /<key>)
 *   --host brandthree.com    production hostname     (repeatable)
 *   --locale en-us           locale                  (repeatable, default en-us)
 *   --from moog              clone another brand's structure and flags, values blanked
 *   --features a,b           capability flags to enable
 *   --dry-run                print the plan, write nothing
 *   --check                  audit an existing brand for completeness
 *   --force                  overwrite files that already exist
 *
 * Exit: 0 success, 1 refused or incomplete.
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

/* ------------------------------------------------------------------ options */

const argv = process.argv.slice(2);
const key = argv.find((a) => !a.startsWith('--'));

const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const multi = (n) => argv.reduce((acc, a, i) => (a === `--${n}` && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);

const DRY = flag('dry-run');
const CHECK = flag('check');
const FORCE = flag('force');
const ROOT = process.cwd();

if (!key || !/^[a-z][a-z0-9]*$/.test(key)) {
  console.error('Usage: node scripts/onboard-brand.mjs <key> [--name "..."] [--from <brand>] [--dry-run] [--check]');
  console.error('\nThe key must be lowercase alphanumeric with no hyphens. It is used verbatim in');
  console.error('file names, the brand attribute, directory names and content metadata, so an');
  console.error('inconsistent key is the most common cause of a token file that never loads.');
  process.exit(1);
}

/* ------------------------------------------------------------ project shape */

const DEFAULT_PATHS = {
  components: 'blocks',
  brandTokens: 'styles/brands',
  tokenContract: 'styles/tokens/contract.json',
  registry: 'brands.json',
  icons: 'icons',
  fonts: 'fonts',
  queryConfig: 'helix-query.yaml',
  authoringFilters: 'component-filters.json',
  ciWorkflow: '.github/workflows/quality-gates.yml',
  docs: 'docs/brands',
};

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const platform = existsSync(join(ROOT, 'platform.json')) ? readJson(join(ROOT, 'platform.json')) : {};
const P = { ...DEFAULT_PATHS, ...(platform.paths ?? {}) };
const brandAttr = platform.conventions?.brandAttribute ?? 'data-brand';

const name = opt('name', key.charAt(0).toUpperCase() + key.slice(1));
const prefix = opt('prefix', `/${key}`);
const hosts = multi('host');
const locales = multi('locale').length ? multi('locale') : ['en-us'];
const from = opt('from', null);
const features = (opt('features', '') || '').split(',').filter(Boolean);

const actions = [];
const skipped = [];
const todo = [];

const plan = (label, path, fn) => {
  if (existsSync(join(ROOT, path)) && !FORCE) {
    skipped.push(`${label}: ${path} already exists (--force to overwrite)`);
    return;
  }
  actions.push({ label, path, fn });
};

/* ------------------------------------------------------------------- check */

if (CHECK) {
  const problems = [];
  const ok = [];
  const inspect = (label, path, extra = () => null) => {
    if (!existsSync(join(ROOT, path))) { problems.push(`${label} missing: ${path}`); return; }
    const note = extra();
    if (note) problems.push(`${label}: ${note}`); else ok.push(`${label}: ${path}`);
  };

  inspect('registry entry', P.registry, () => {
    const r = readJson(join(ROOT, P.registry));
    return r.brands?.[key] ? null : `no "${key}" entry in ${P.registry}`;
  });
  inspect('token file', `${P.brandTokens}/${key}.css`, () => {
    const css = readFileSync(join(ROOT, P.brandTokens, `${key}.css`), 'utf8');
    const stubs = (css.match(/TODO/g) ?? []).length;
    return stubs ? `${stubs} token value(s) still marked TODO` : null;
  });
  inspect('icons', `${P.icons}/${key}`, () => {
    const files = readdirSync(join(ROOT, P.icons, key)).filter((f) => f !== '.gitkeep');
    return files.length ? null : 'directory is empty (logo, inverse logo, favicon)';
  });
  inspect('fonts', `${P.fonts}/${key}`, () => {
    const files = readdirSync(join(ROOT, P.fonts, key)).filter((f) => f !== '.gitkeep');
    return files.length ? null : 'directory is empty (woff2)';
  });
  if (existsSync(join(ROOT, P.queryConfig))) {
    const yaml = readFileSync(join(ROOT, P.queryConfig), 'utf8');
    if (!yaml.includes(`${prefix}/**`)) problems.push(`index missing: no ${prefix}/** entry in ${P.queryConfig}`);
    else ok.push(`index: ${P.queryConfig}`);
  }
  if (existsSync(join(ROOT, P.ciWorkflow))) {
    const wf = readFileSync(join(ROOT, P.ciWorkflow), 'utf8');
    if (!wf.includes(key)) problems.push(`CI: ${key} is not in the per-brand matrix in ${P.ciWorkflow}`);
    else ok.push(`CI matrix: ${P.ciWorkflow}`);
  }

  console.log(`\nBrand "${key}" audit\n`);
  ok.forEach((o) => console.log(`  ok    ${o}`));
  problems.forEach((p) => console.log(`  TODO  ${p}`));
  console.log(problems.length
    ? `\n${problems.length} item(s) outstanding. Content and template steps are not machine-checkable; see ${P.docs}/${key}.md.`
    : '\nAll machine-checkable steps complete. Content, templates and the visual gates remain.');
  process.exit(problems.length ? 1 : 0);
}

/* -------------------------------------------------------- 1. registry entry */

const registryPath = join(ROOT, P.registry);
if (!existsSync(registryPath)) {
  console.error(`Missing ${P.registry}. Create the brand registry before onboarding.`);
  process.exit(1);
}
const registry = readJson(registryPath);
registry.brands = registry.brands ?? {};

if (registry.brands[key] && !FORCE) {
  skipped.push(`registry: "${key}" already present in ${P.registry}`);
} else {
  const source = from ? registry.brands[from] : null;
  if (from && !source) {
    console.error(`--from ${from}: no such brand in ${P.registry}`);
    process.exit(1);
  }
  const entry = {
    key,
    name,
    pathPrefix: prefix,
    hosts,
    locales,
    indexPath: `${prefix}/query-index.json`,
    // Cloning a sibling's flags is usually right: brands in one repo tend to share a
    // capability surface. Values are cloned, not the brand's identity.
    features: features.length
      ? Object.fromEntries(features.map((f) => [f, true]))
      : Object.fromEntries(Object.keys(source?.features ?? {}).map((f) => [f, false])),
    endpoints: Object.fromEntries(Object.keys(source?.endpoints ?? {}).map((e) => [e, ''])),
  };
  actions.push({
    label: 'registry entry',
    path: P.registry,
    fn: () => {
      registry.brands[key] = entry;
      writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    },
  });
  if (from) todo.push(`Set endpoint URLs cloned from "${from}" in ${P.registry} (they are blank)`);
}

/* ------------------------------------------------------------ 2. token file */

const contractPath = join(ROOT, P.tokenContract);
if (!existsSync(contractPath)) {
  console.error(`Missing ${P.tokenContract}. The token contract defines what a brand must supply.`);
  process.exit(1);
}
const contract = readJson(contractPath);
const groups = Array.isArray(contract) ? { tokens: contract } : (contract.tokens ?? contract);
const tokenCount = Object.values(groups).flat().length;

plan('token file', `${P.brandTokens}/${key}.css`, () => {
  let css = `/*
 * ${name} — brand tokens
 *
 * Custom property definitions ONLY. No element or class selectors, no layout rules, no
 * component styling. A selector here means the difference belongs in a component token,
 * or the component has genuinely diverged and needs an ADR.
 *
 * Every value below must be filled. Leaving one blank does not fall back to a sensible
 * default; it inherits from whichever brand loaded, which surfaces as a bug on one page
 * weeks later.
 */

:root[${brandAttr}='${key}'] {
  /* --- private primitives (brand-internal, not part of the contract) --- */
  /* --${key}-primary-600: #000000; */

`;
  for (const [group, tokens] of Object.entries(groups)) {
    css += `  /* --- ${group} --- */\n`;
    for (const t of tokens) css += `  ${t}: /* TODO */;\n`;
    css += '\n';
  }
  css += `  /* --- component token overrides (optional) --- */
  /* --header-height: 72px; */
}

/* Brand fonts. Match fallback metrics so swapping does not shift layout. */
/*
@font-face {
  font-family: '${name} Sans';
  src: url('/${P.fonts}/${key}/sans.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;
}
*/
`;
  mkdirSync(join(ROOT, P.brandTokens), { recursive: true });
  writeFileSync(join(ROOT, P.brandTokens, `${key}.css`), css);
});
todo.push(`Fill all ${tokenCount} token values in ${P.brandTokens}/${key}.css from the design system`);

/* ----------------------------------------------------------- 3. directories */

for (const dir of [`${P.icons}/${key}`, `${P.fonts}/${key}`]) {
  plan('directory', dir, () => {
    mkdirSync(join(ROOT, dir), { recursive: true });
    writeFileSync(join(ROOT, dir, '.gitkeep'), '');
  });
}
todo.push(`Add logo, inverse logo and favicon to ${P.icons}/${key}/; woff2 files to ${P.fonts}/${key}/`);

/* -------------------------------------------------------- 4. content index */

if (existsSync(join(ROOT, P.queryConfig))) {
  const yaml = readFileSync(join(ROOT, P.queryConfig), 'utf8');
  if (yaml.includes(`${prefix}/**`)) {
    skipped.push(`index: ${prefix}/** already in ${P.queryConfig}`);
  } else {
    actions.push({
      label: 'content index',
      path: P.queryConfig,
      fn: () => {
        const entry = `  ${key}:\n    include: ['${prefix}/**']\n    target: ${prefix}/query-index.json\n`;
        writeFileSync(join(ROOT, P.queryConfig), `${yaml.trimEnd()}\n${entry}`);
      },
    });
  }
} else {
  todo.push(`Add a ${prefix}/** index to your content indexing config`);
}

/* ------------------------------------------------------ 5. authoring filters */

if (existsSync(join(ROOT, P.authoringFilters))) {
  const filters = readJson(join(ROOT, P.authoringFilters));
  const sourceFilter = from && filters[from] ? from : null;
  if (filters[key] && !FORCE) {
    skipped.push(`authoring filters: "${key}" already present`);
  } else if (sourceFilter) {
    actions.push({
      label: 'authoring filters',
      path: P.authoringFilters,
      fn: () => {
        filters[key] = JSON.parse(JSON.stringify(filters[sourceFilter]));
        writeFileSync(join(ROOT, P.authoringFilters), `${JSON.stringify(filters, null, 2)}\n`);
      },
    });
    todo.push(`Review the filter cloned from "${sourceFilter}" in ${P.authoringFilters} and remove blocks this brand should not offer`);
  } else {
    todo.push(`Scope ${P.authoringFilters} so authors on ${key} see only valid blocks`);
  }
}

/* ------------------------------------------------------------ 6. CI matrix */

if (existsSync(join(ROOT, P.ciWorkflow))) {
  const wf = readFileSync(join(ROOT, P.ciWorkflow), 'utf8');
  const m = wf.match(/(\n\s*brand:\s*\[)([^\]]*)(\])/);
  if (!m) {
    todo.push(`Add ${key} to the per-brand job matrix in ${P.ciWorkflow}`);
  } else if (m[2].includes(key)) {
    skipped.push(`CI matrix: ${key} already present`);
  } else {
    actions.push({
      label: 'CI matrix',
      path: P.ciWorkflow,
      fn: () => {
        // Without this the new brand never gets its own Lighthouse and axe run, and a
        // blended average hides a regression in exactly the brand nobody is watching.
        const updated = wf.replace(m[0], `${m[1]}${m[2].trim()}, ${key}${m[3]}`);
        writeFileSync(join(ROOT, P.ciWorkflow), updated);
      },
    });
  }
}

/* --------------------------------------------------------- 7. checklist doc */

plan('onboarding checklist', `${P.docs}/${key}.md`, () => {
  const doc = `# Onboarding: ${name}

Key \`${key}\` · prefix \`${prefix}\` · locales ${locales.join(', ')}
Generated by \`scripts/onboard-brand.mjs\`. Audit progress with:

\`\`\`bash
node scripts/onboard-brand.mjs ${key} --check
\`\`\`

## Automated

- [x] Registry entry in \`${P.registry}\`
- [x] Token file \`${P.brandTokens}/${key}.css\` (values still TODO)
- [x] \`${P.icons}/${key}/\` and \`${P.fonts}/${key}/\`
- [x] Content index for \`${prefix}/**\`
- [x] Per-brand CI matrix entry

## Design and engineering

- [ ] Fill all ${tokenCount} contract token values
- [ ] Logo, inverse logo, favicon, woff2 fonts
- [ ] Contrast verified against **this brand's** tokens (4.5:1 body, 3:1 large and UI)
- [ ] Authoring filters scoped

## Content

- [ ] \`${prefix}/\` created with \`nav\`, \`footer\`, \`placeholders.json\`, \`metadata\`
- [ ] \`theme: ${key}\` set in bulk metadata for \`${prefix}/**\`
- [ ] Placeholder keys copied from an existing brand so none render a fallback
- [ ] Template page per page type
- [ ] Sitemap and launch redirects

## Gates

- [ ] \`node scripts/validate-tokens.mjs\`
- [ ] \`npm run lint\`
- [ ] Lighthouse mobile 100/100/100/100 on this brand's preview URL
- [ ] axe clean on home, a listing page, a detail page
- [ ] Smoke page exercising every shared block, visually checked
- [ ] Existing brands re-verified as unaffected

## Sign-off

- [ ] **Zero shared JavaScript modified.** If any step required it, log it as a framework
      defect: the fix is to lift that difference into a token, a capability flag or
      content, not to add a branch. Every branch added here is a tax the next brand pays.
- [ ] Onboarding time recorded and friction points logged
`;
  mkdirSync(join(ROOT, dirname(`${P.docs}/${key}.md`)), { recursive: true });
  writeFileSync(join(ROOT, P.docs, `${key}.md`), doc);
});

/* ------------------------------------------------------------- execute */

console.log(`\n${DRY ? 'Plan for' : 'Onboarding'} ${name} (${key})\n`);

if (!actions.length) {
  console.log('  nothing to do — every step is already in place');
} else {
  for (const a of actions) {
    if (!DRY) a.fn();
    console.log(`  ${DRY ? 'would write' : 'wrote'}  ${a.path}${a.label === 'token file' ? `  (${tokenCount} tokens stubbed)` : ''}`);
  }
}
for (const s of skipped) console.log(`  skipped    ${s}`);

console.log('\nRemaining, in order:\n');
todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
console.log(`\n  Checklist: ${P.docs}/${key}.md`);
console.log(`  Progress:  node scripts/onboard-brand.mjs ${key} --check`);
console.log(`  Gate:      node scripts/validate-tokens.mjs\n`);

if (DRY) console.log('Dry run: nothing was written.\n');
