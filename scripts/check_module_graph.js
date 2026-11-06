/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Bundles the built ESM graph of each declared entry with esbuild, every package
// external, and fails when a forbidden specifier is reachable. An ES module evaluates its whole top-level import list
// when any one of its exports is imported, so reachability, not direct import,
// is what matters.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';

import {
  CHARTS,
  CHARTS_RENDERER_DIRS,
  CONTRACT_ENTRIES,
  CONTRACT_FORBIDDEN,
  ENGINE_PACKAGE_PREFIX,
  isRendererSource,
  matchesForbidden,
  rendererViolations,
} from './chart_module_rules.js';
import { specifiersIn as specifiersInSource } from './specifiers.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

/**
 * Specifiers that must stay unreachable from an entry, by package and export key.
 * A forbidden specifier covers the package and every subpath under it.
 *
 * `react-dom/server` is the one worth guarding: it is the heavy server renderer,
 * and pulling it onto an entry a text-only or edge host imports costs that host
 * a dependency it never asked for. `./html` and `./react` reach it by design.
 *
 * Bare `react` is deliberately absent. `render/primitive_dispatch` uses
 * `cloneElement` and `isValidElement` to carry React renderers, so every surface
 * reaches it through the shared dispatcher — that is the design, not a leak.
 */
const RULES = {
  '@elastic/isomer-sdk': {
    '.': ['react-dom', 'react-dom/server'],
    './text': ['react-dom', 'react-dom/server'],
    './markdown': ['react-dom', 'react-dom/server'],
    './slack': ['react-dom', 'react-dom/server'],
    './author': ['react-dom', 'react-dom/server'],
    './schema': [
      'react',
      'react-dom',
      'mdast-util-from-markdown',
      'mdast-util-gfm',
      'mdast-util-to-markdown',
      'micromark-extension-gfm',
    ],
  },
  [CHARTS]: Object.fromEntries(
    CONTRACT_ENTRIES.map((entry) => [entry, CONTRACT_FORBIDDEN])
  ),
};

const specifiersIn = (file) => specifiersInSource(readFileSync(file, 'utf-8'));

/** Every bare specifier reachable from `entryFile` through its relative imports. */
const reachableBareSpecifiers = async (entryFile) => {
  const { metafile } = await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    metafile: true,
    packages: 'external',
    platform: 'neutral',
    logLevel: 'silent',
  });
  return new Set(
    Object.values(metafile.inputs).flatMap(({ imports }) =>
      imports.filter(({ external }) => external).map(({ path }) => path)
    )
  );
};

const manifests = new Map(
  workspacePackages().map((pkg) => [pkg.manifest.name, pkg])
);

const violations = [];
let checked = 0;

for (const [packageName, entryRules] of Object.entries(RULES)) {
  const pkg = manifests.get(packageName);
  if (!pkg) {
    throw new Error(`${packageName}: not a workspace package`);
  }

  for (const [exportKey, forbidden] of Object.entries(entryRules)) {
    const target = pkg.manifest.exports?.[exportKey]?.import;
    if (!target) {
      throw new Error(`${packageName}: no "import" for export "${exportKey}"`);
    }

    const entryFile = join(pkg.dir, target);
    const reachable = await reachableBareSpecifiers(entryFile);
    checked += 1;

    for (const specifier of reachable) {
      if (forbidden.some((rule) => matchesForbidden(specifier, rule))) {
        violations.push(
          `${packageName} "${exportKey}" (${relative(repoRoot, entryFile)}) reaches "${specifier}"`
        );
      }
    }
  }
}

/** Packages a package must never reach: no specifier in its source, no entry in its dependency fields. */
const FORBIDDEN_PACKAGES = {
  '@elastic/isomer-agent-tools': ['@modelcontextprotocol/sdk'],
  '@elastic/isomer-studio': [
    '@playwright/test',
    'playwright',
    'playwright-core',
    'puppeteer',
    'puppeteer-core',
  ],
};

for (const [packageName, forbidden] of Object.entries(FORBIDDEN_PACKAGES)) {
  const pkg = manifests.get(packageName);
  if (!pkg) {
    throw new Error(`${packageName}: not a workspace package`);
  }
  const sources = readdirSync(join(pkg.dir, 'src'), { recursive: true })
    .filter((file) => /\.[cm]?[jt]sx?$/.test(file))
    .map((file) => join(pkg.dir, 'src', file));
  for (const file of sources) {
    for (const specifier of specifiersIn(file)) {
      if (forbidden.some((rule) => matchesForbidden(specifier, rule))) {
        violations.push(`${relative(repoRoot, file)} imports "${specifier}"`);
      }
    }
  }
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const name of Object.keys(pkg.manifest[field] ?? {})) {
      if (forbidden.some((rule) => matchesForbidden(name, rule))) {
        violations.push(`${packageName} ${field} lists "${name}"`);
      }
    }
  }
}

// Renderers read only the Scene: in the charts pack's renderer directories and
// in every chart engine package.
const charts = manifests.get(CHARTS);
const chartsSrc = join(charts.dir, 'src');
const rendererDirs = [
  ...CHARTS_RENDERER_DIRS.map((dir) => join(charts.dir, dir)),
  ...[...manifests.values()]
    .filter(({ manifest }) => manifest.name.startsWith(ENGINE_PACKAGE_PREFIX))
    .map(({ dir }) => join(dir, 'src')),
].filter((dir) => existsSync(dir));
const rendererFiles = rendererDirs.flatMap((dir) =>
  readdirSync(dir, { recursive: true })
    .filter(isRendererSource)
    .map((file) => join(dir, file))
);
for (const { file, reason } of rendererViolations(
  rendererFiles,
  specifiersIn,
  chartsSrc
)) {
  violations.push(`${relative(repoRoot, file)} imports ${reason}`);
}
checked += rendererDirs.length;

// A host may bundle `slideStylesheet` without the pack; from the built ESM entry, that bundle must emit what the CommonJS build does.
const slides = manifests.get('@elastic/isomer-primitives-slides');
const { import: slidesEsm, require: slidesCjs } = slides.manifest.exports['.'];
const stylesheetBundle = join(slides.dir, '.stylesheet-check', 'index.mjs');
const stylesheetOf = (args) =>
  execFileSync(process.execPath, args, {
    cwd: slides.dir,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
try {
  await build({
    stdin: {
      contents: `export { slideStylesheet } from '${slidesEsm}';\n`,
      resolveDir: slides.dir,
      loader: 'js',
    },
    outfile: stylesheetBundle,
    bundle: true,
    format: 'esm',
    // Isomer packages build ESM for bundlers alone, so only third-party packages stay external.
    external: [
      ...Object.keys(slides.manifest.dependencies ?? {}),
      ...Object.keys(slides.manifest.peerDependencies ?? {}),
    ].filter((name) => !name.startsWith('@elastic/isomer-')),
    banner: {
      js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
    },
    platform: 'node',
    logLevel: 'silent',
  });
  const bundled = stylesheetOf([
    '--input-type=module',
    '--eval',
    `const { slideStylesheet } = await import(${JSON.stringify(pathToFileURL(stylesheetBundle).href)}); process.stdout.write(slideStylesheet());`,
  ]);
  const required = stylesheetOf([
    '--eval',
    `process.stdout.write(require(${JSON.stringify(slidesCjs)}).slideStylesheet());`,
  ]);
  checked += 1;
  if (!required.includes('.stat-root')) {
    violations.push(
      `${slides.manifest.name}: ${slidesCjs} emits no primitive CSS from slideStylesheet`
    );
  } else if (bundled !== required) {
    violations.push(
      `${slides.manifest.name}: a bundle of slideStylesheet alone from ${slidesEsm} emits ${bundled.length} characters of CSS; ${slidesCjs} emits ${required.length}`
    );
  }
} finally {
  rmSync(dirname(stylesheetBundle), { force: true, recursive: true });
}

if (violations.length > 0) {
  console.error(
    `Module graph check failed:\n${violations.map((line) => `  - ${line}`).join('\n')}`
  );
  process.exitCode = 1;
} else {
  console.log(`Module graph check passed: ${checked} entry point(s).`);
}
