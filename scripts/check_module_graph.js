/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Walks the built ESM graph from each declared entry and fails when a forbidden
// specifier is reachable. An ES module evaluates its whole top-level import list
// when any one of its exports is imported, so reachability, not direct import,
// is what matters.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import {
  hasComputedImport,
  specifiersIn as specifiersInSource,
} from './specifiers.js';
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
  },
};

const matchesForbidden = (specifier, forbidden) =>
  specifier === forbidden || specifier.startsWith(`${forbidden}/`);

const isRelative = (specifier) => specifier.startsWith('.');

/** The file a relative specifier in `from` names: emitted JavaScript as written, a declaration by probing. */
const resolveRelative = (from, specifier) => {
  const base = resolve(join(dirname(from), specifier));
  if (!from.endsWith('.d.ts')) {
    // The build rewrites relative specifiers to full paths with extensions.
    return base;
  }
  return (
    [
      base.replace(/\.js$/, '.d.ts'),
      `${base}.d.ts`,
      join(base, 'index.d.ts'),
      base,
    ].find((candidate) => existsSync(candidate)) ?? base
  );
};

/**
 * Every bare specifier reachable from `entryFile`, following relative imports
 * only, and every reachable file with an `import()` of a computed specifier.
 */
const reachableFrom = (entryFile) => {
  const seen = new Set();
  const bare = new Set();
  const computed = [];
  const queue = [resolve(entryFile)];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    const source = readFileSync(file, 'utf-8');
    if (hasComputedImport(source)) {
      computed.push(file);
    }

    for (const specifier of specifiersInSource(source)) {
      if (isRelative(specifier)) {
        queue.push(resolveRelative(file, specifier));
      } else {
        bare.add(specifier);
      }
    }
  }

  return { bare, computed };
};

/** Packages that must not appear in a package's dependency fields at all, even as an optional peer. */
const FORBIDDEN_DEPENDENCIES = {};

const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
];

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
    const entry = pkg.manifest.exports?.[exportKey];
    if (!entry?.import) {
      throw new Error(`${packageName}: no "import" for export "${exportKey}"`);
    }

    // The declarations count too: a type-only import still makes consumers install the package.
    for (const target of [entry.import, entry.types].filter(Boolean)) {
      const entryFile = join(pkg.dir, target);
      const { bare, computed } = reachableFrom(entryFile);
      checked += 1;

      for (const specifier of bare) {
        if (forbidden.some((rule) => matchesForbidden(specifier, rule))) {
          violations.push(
            `${packageName} "${exportKey}" (${relative(repoRoot, entryFile)}) reaches "${specifier}"`
          );
        }
      }
      for (const file of computed) {
        violations.push(
          `${packageName} "${exportKey}" reaches a computed import() in ${relative(repoRoot, file)}`
        );
      }
    }
  }
}

for (const [packageName, forbidden] of Object.entries(FORBIDDEN_DEPENDENCIES)) {
  const pkg = manifests.get(packageName);
  if (!pkg) {
    throw new Error(`${packageName}: not a workspace package`);
  }
  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(pkg.manifest[field] ?? {})) {
      if (forbidden.some((rule) => matchesForbidden(name, rule))) {
        violations.push(`${packageName} lists forbidden "${name}" in ${field}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `Module graph check failed:\n${violations.map((line) => `  - ${line}`).join('\n')}`
  );
  process.exitCode = 1;
} else {
  console.log(`Module graph check passed: ${checked} entry point(s).`);
}
