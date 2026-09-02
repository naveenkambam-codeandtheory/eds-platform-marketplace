#!/usr/bin/env node
/**
 * Multi-brand token validator.
 *
 * Reads platform.json for the project's shape, so this file is stack-agnostic: point it
 * at blocks/ + styles/brands/ for EDS, or src/components/ + src/themes/ for a React app,
 * and the checks are identical. Defaults match the EDS layout when platform.json is absent.
 *
 * Checks the three things that stay invisible until a brand looks wrong in production:
 *   1. every brand file defines every token in the contract, with a real value
 *   2. brand files contain custom property definitions only, not styling
 *   3. shared component CSS contains no hardcoded colours or font stacks
 * Then reports the fork ratio, the health metric for the whole framework.
 *
 * Usage:  node scripts/validate-tokens.mjs [--root .] [--quiet] [--json]
 * Exit:   0 clean, 1 violations found.
 */

import {
  readFileSync, readdirSync, existsSync, statSync,
} from 'node:fs';
import {
  join, basename, extname, relative, sep,
} from 'node:path';

const args = process.argv.slice(2);
const ROOT = args.includes('--root') ? args[args.indexOf('--root') + 1] : process.cwd();
const QUIET = args.includes('--quiet');
const AS_JSON = args.includes('--json');

/* ------------------------------------------------------------ project shape */

const DEFAULTS = {
  paths: {
    components: 'blocks',
    brandTokens: 'styles/brands',
    tokenContract: 'styles/tokens/contract.json',
    registry: 'brands.json',
    registryModule: 'scripts/brands.js',
  },
  conventions: {
    // A fork lives at <component>/<brandKey>/<brandKey>.* — same component name,
    // brand-scoped subfolder — never a sibling component renamed with a brand prefix.
    forkSubdir: '{brandKey}',
    allowedLiteralColors: ['#fff', '#ffffff', '#000', '#000000'],
    repoless: false,
  },
  budgets: { forkRatioTarget: 15, forkRatioMax: 20, brandTokenFileKb: 8 },
};

const read = (p) => readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

const platformPath = join(ROOT, 'platform.json');
const platform = existsSync(platformPath) ? readJson(platformPath) : {};
const cfg = {
  paths: { ...DEFAULTS.paths, ...(platform.paths ?? {}) },
  conventions: { ...DEFAULTS.conventions, ...(platform.conventions ?? {}) },
  budgets: { ...DEFAULTS.budgets, ...(platform.budgets ?? {}) },
};

const CONTRACT = join(ROOT, cfg.paths.tokenContract);
const BRAND_DIR = join(ROOT, cfg.paths.brandTokens);
const COMPONENT_DIR = join(ROOT, cfg.paths.components);
const REGISTRY = join(ROOT, cfg.paths.registry);
const REGISTRY_MODULE = join(ROOT, cfg.paths.registryModule);

const errors = [];
const warnings = [];
const fail = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/* ------------------------------------------------------------------ helpers */

const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Custom properties defined in a stylesheet, mapped to their declared value. */
function definedTokens(css) {
  const out = new Map();
  const re = /(^|[;{\s])(--[a-z0-9-]+)\s*:([^;}]*)/gi;
  for (const m of css.matchAll(re)) out.set(m[2], m[3].trim());
  return out;
}

function walk(dir, ext, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, ext, acc);
    else if (extname(entry) === ext) acc.push(full);
  }
  return acc;
}

/* ---------------------------------------------------------- 1. the contract */

if (!existsSync(CONTRACT)) {
  console.error(`Missing token contract at ${relative(ROOT, CONTRACT)} (set paths.tokenContract in platform.json).`);
  process.exit(1);
}

const contract = readJson(CONTRACT);
const required = Array.isArray(contract)
  ? contract
  : Object.values(contract.tokens ?? contract).flat();

const registry = existsSync(REGISTRY) ? readJson(REGISTRY) : null;
const brandKeys = registry ? Object.keys(registry.brands ?? {}) : null;

/* -------------------------------------------------------- 2. the brand files */

const brandFiles = existsSync(BRAND_DIR)
  ? readdirSync(BRAND_DIR).filter((f) => f.endsWith('.css'))
  : [];

if (!brandFiles.length) fail(relative(ROOT, BRAND_DIR), 'no brand token files found');

// Registry and filenames must agree. A mismatch means a token file that never loads.
if (brandKeys) {
  const fileKeys = brandFiles.map((f) => basename(f, '.css'));
  brandKeys
    .filter((k) => !fileKeys.includes(k))
    .forEach((k) => fail(cfg.paths.registry, `brand "${k}" is registered but ${cfg.paths.brandTokens}/${k}.css is missing`));
  fileKeys
    .filter((k) => !brandKeys.includes(k))
    .forEach((k) => warn(`${cfg.paths.brandTokens}/${k}.css`, 'token file has no matching entry in the registry'));
}

// brand.js imports the registry as a module instead of fetching brands.json, to avoid a
// network round trip before first paint (step 10 of the setup guide). That means it can
// silently drift from brands.json — a brand missing here resolves to the default brand
// instead of erroring, which is a much quieter failure than a 404. Only checked if the
// project actually has this file; not every project uses the module pattern.
if (brandKeys && existsSync(REGISTRY_MODULE)) {
  try {
    const mod = await import(`file://${REGISTRY_MODULE}`);
    const moduleKeys = Object.keys(mod.default?.brands ?? {});
    brandKeys
      .filter((k) => !moduleKeys.includes(k))
      .forEach((k) => fail(
        cfg.paths.registryModule,
        `brand "${k}" is in ${cfg.paths.registry} but missing here — brand.js would silently resolve it to the default brand instead`,
      ));
    moduleKeys
      .filter((k) => !brandKeys.includes(k))
      .forEach((k) => warn(cfg.paths.registryModule, `brand "${k}" has no matching entry in ${cfg.paths.registry} — stale?`));
  } catch (e) {
    fail(cfg.paths.registryModule, `could not load as a module: ${e.message}`);
  }
}

// A repoless project (aem.live/developer/repoless-authoring) resolves every brand to its
// own hostname; a non-'/' pathPrefix on a repoless brand builds every ${pathPrefix}/…
// path in shared block code one level too deep, and is silent until a block actually
// does that construction. Caught here, once, instead of per-brand at runtime.
if (brandKeys && cfg.conventions.repoless && registry.brands) {
  brandKeys
    .filter((k) => registry.brands[k].pathPrefix !== '/')
    .forEach((k) => fail(
      cfg.paths.registry,
      `brand "${k}" has pathPrefix "${registry.brands[k].pathPrefix}", but conventions.repoless is true — every brand should resolve at its own hostname's root ("/"), not a path segment`,
    ));
}

// Selectors a brand file may contain. Anything else is styling, which means the
// "token file" has quietly become a fork.
const ALLOWED_SELECTOR = /^(:root(\[[a-z-]+=['"][a-z0-9-]+['"]\])?|\[[a-z-]+=['"][a-z0-9-]+['"]\]|@media[^{]*|@supports[^{]*|@font-face|html|:where\([^)]*\))$/i;

for (const file of brandFiles) {
  const rel = `${cfg.paths.brandTokens}/${file}`;
  const css = decomment(read(join(BRAND_DIR, file)));
  const defined = definedTokens(css);

  const missing = required.filter((t) => !defined.has(t));
  if (missing.length) {
    fail(rel, `missing ${missing.length} contract token(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
  }

  // A scaffolded stub is worse than a missing token: it looks defined and then
  // resolves to nothing at runtime.
  const unfilled = required.filter((t) => defined.has(t) && defined.get(t) === '');
  if (unfilled.length) {
    fail(rel, `${unfilled.length} token(s) still unfilled from the scaffold: ${unfilled.slice(0, 8).join(', ')}${unfilled.length > 8 ? ', …' : ''}`);
  }

  for (const raw of css.match(/(^|})\s*([^{}@][^{}]*)\{/g) ?? []) {
    const selector = raw.replace(/^[}\s]*/, '').replace(/\s*\{$/, '').trim();
    if (!selector) continue;
    for (const part of selector.split(',').map((s) => s.trim())) {
      if (!ALLOWED_SELECTOR.test(part)) {
        fail(rel, `disallowed selector "${part}" — brand files define custom properties only`);
      }
    }
  }

  const kb = Buffer.byteLength(css, 'utf8') / 1024;
  if (kb > cfg.budgets.brandTokenFileKb) {
    warn(rel, `${kb.toFixed(1)} KB exceeds the ${cfg.budgets.brandTokenFileKb} KB budget (loads eagerly on every page)`);
  }
}

/* --------------------------------------------- 3. shared component CSS scan */

const HEX = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const FUNC_COLOR = /\b(?:rgba?|hsla?|oklch|lab|color-mix)\s*\(/gi;
const FONT_DECL = /font-family\s*:\s*([^;}]+)/gi;

const literalFontStacks = (css) => [...css.matchAll(FONT_DECL)].map((m) => m[1].trim()).filter((v) => !v.startsWith('var('));

const forkSubdirs = (brandKeys ?? []).map((k) => cfg.conventions.forkSubdir.replace('{brandKey}', k));
// A fork file sits inside a brand-named subfolder of its component, e.g.
// blocks/header/moog/moog.js — check path segments, not the filename.
const isFork = (p) => relative(COMPONENT_DIR, p).split(sep).slice(0, -1)
  .some((seg) => forkSubdirs.includes(seg));
const allowedLiteral = new Set(cfg.conventions.allowedLiteralColors.map((c) => c.toLowerCase()));

for (const file of walk(COMPONENT_DIR, '.css')) {
  const rel = relative(ROOT, file);
  // Declared forks may carry brand literals; they answer for themselves via an ADR.
  if (isFork(file)) continue;
  const css = decomment(read(file));

  const hits = [...(css.match(HEX) ?? []), ...(css.match(FUNC_COLOR) ?? [])]
    .filter((h) => !allowedLiteral.has(h.toLowerCase()));
  if (hits.length) {
    fail(rel, `hardcoded colour(s): ${[...new Set(hits)].slice(0, 5).join(', ')} — use a token`);
  }

  const stacks = literalFontStacks(css);
  if (stacks.length) {
    fail(rel, `literal font stack: ${stacks[0]} — use a font token`);
  }
}

/* ------------------------------------------------ hidden divergence scan */

/*
 * The fork ratio alone is gameable, and gamed in the worst direction. A team that
 * avoids a forked folder by putting `if (brand === 'x')` in shared JS, or a wall of
 * [data-brand] rules in shared CSS, scores 0% while the codebase is more entangled
 * than an honest fork would have been. Declared divergence can at least be found,
 * reviewed, and re-merged. Hidden divergence cannot.
 *
 * So we count both, and report a divergence index rather than a fork count.
 */

const hidden = { conditionals: [], scoped: [] };

if (brandKeys?.length) {
  const keyAlternation = brandKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // A brand key appearing in a comparison, switch case, or object lookup in shared code.
  const CONDITIONAL = new RegExp(`(?:===?|!==?|case\\s+|\\[)\\s*['"\`](${keyAlternation})['"\`]`, 'g');

  for (const file of walk(COMPONENT_DIR, '.js')) {
    if (isFork(file)) continue;
    const js = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const hits = [...js.matchAll(CONDITIONAL)].map((m) => m[1]);
    if (hits.length) {
      hidden.conditionals.push({
        file: relative(ROOT, file), keys: [...new Set(hits)], count: hits.length,
      });
      fail(
        relative(ROOT, file),
        `${hits.length} brand-name conditional(s) on ${[...new Set(hits)].join(', ')} — branch on a capability flag instead`,
      );
    }
  }

  // Brand-scoped CSS is legitimate in small doses and a disguised fork in large ones.
  const SCOPED = new RegExp(`\\[\\s*${cfg.conventions.brandAttribute ?? 'data-brand'}\\s*[~^|*$]?=`, 'g');
  const cap = cfg.budgets.scopedRulePct ?? 20;

  for (const file of walk(COMPONENT_DIR, '.css')) {
    if (isFork(file)) continue;
    const css = decomment(readFileSync(file, 'utf8'));
    const rules = (css.match(/\{/g) ?? []).length;
    const scoped = (css.match(SCOPED) ?? []).length;
    if (!scoped) continue;
    const pct = rules ? (scoped / rules) * 100 : 0;
    hidden.scoped.push({
      file: relative(ROOT, file), scoped, rules, pct,
    });
    if (pct > cap) {
      fail(
        relative(ROOT, file),
        `${scoped}/${rules} rules are brand-scoped (${pct.toFixed(0)}%, cap ${cap}%) — promote to component tokens or declare the fork`,
      );
    } else if (scoped > 2) {
      warn(relative(ROOT, file), `${scoped} brand-scoped rules — check whether a component token would generalise them`);
    }
  }
}

/* ---------------------------------------------------------------- fork ratio */

let forkStats = null;
if (existsSync(COMPONENT_DIR) && brandKeys?.length) {
  const components = readdirSync(COMPONENT_DIR)
    .filter((d) => statSync(join(COMPONENT_DIR, d)).isDirectory());
  // A component counts as forked if it has at least one brand-named subfolder,
  // e.g. blocks/header/moog/ — the component itself keeps its shared name.
  const forks = components.filter(
    (b) => forkSubdirs.some((s) => existsSync(join(COMPONENT_DIR, b, s))),
  );
  const ratio = components.length ? (forks.length / components.length) * 100 : 0;
  forkStats = { total: components.length, forks, ratio };

  if (ratio > cfg.budgets.forkRatioMax) {
    fail(cfg.paths.components, `fork ratio ${ratio.toFixed(1)}% exceeds the ${cfg.budgets.forkRatioMax}% architecture-review threshold`);
  } else if (ratio > cfg.budgets.forkRatioTarget) {
    warn(cfg.paths.components, `fork ratio ${ratio.toFixed(1)}% is above the ${cfg.budgets.forkRatioTarget}% target`);
  }
}

/* -------------------------------------------------------------------- report */

if (AS_JSON) {
  console.log(JSON.stringify({
    platform: platform.platform ?? 'default',
    contractTokens: required.length,
    brands: brandFiles.length,
    forkRatio: forkStats?.ratio ?? null,
    forks: forkStats?.forks ?? [],
    hiddenDivergence: hidden,
    warnings,
    errors,
  }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

if (!QUIET) {
  if (forkStats) {
    console.log(`\nDeclared forks: ${forkStats.forks.length}/${forkStats.total} components (${forkStats.ratio.toFixed(1)}%)`);
    if (forkStats.forks.length) console.log(`  forked: ${forkStats.forks.join(', ')}`);

    const entangled = new Set([
      ...hidden.conditionals.map((h) => h.file.split('/')[1]),
      ...hidden.scoped.filter((h) => h.scoped > 2).map((h) => h.file.split('/')[1]),
    ]);
    console.log(`Hidden divergence: ${entangled.size} shared component(s)`);
    hidden.conditionals.forEach((h) => console.log(`  cond  ${h.file}  ${h.keys.join(', ')} x${h.count}`));
    hidden.scoped.forEach((h) => console.log(`  css   ${h.file}  ${h.scoped}/${h.rules} rules (${h.pct.toFixed(0)}%)`));

    const index = forkStats.total
      ? ((forkStats.forks.length + entangled.size) / forkStats.total) * 100 : 0;
    console.log(`\nDivergence index: ${index.toFixed(1)}%  (declared + hidden)`);
  }
  console.log(`\nContract: ${required.length} tokens · Brands: ${brandFiles.length} · Platform: ${platform.platform ?? 'default'}`);
}

for (const w of warnings) console.warn(`  warn  ${w.file}: ${w.msg}`);
for (const e of errors) console.error(`  FAIL  ${e.file}: ${e.msg}`);

if (errors.length) {
  console.error(`\n${errors.length} violation(s).`);
  process.exit(1);
}
console.log(`\nToken validation passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
