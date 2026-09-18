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

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { specifiersIn as specifiersInSource } from './specifiers.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

/**
 * Specifiers that must stay unreachable from an entry, by package and export key.
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

const specifiersIn = (file) => specifiersInSource(readFileSync(file, 'utf-8'));

const isRelative = (specifier) => specifier.startsWith('.');

/** Every bare specifier reachable from `entryFile`, following relative imports only. */
const reachableBareSpecifiers = (entryFile) => {
  const seen = new Set();
  const bare = new Set();
  const queue = [resolve(entryFile)];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);

    for (const specifier of specifiersIn(file)) {
      if (!isRelative(specifier)) {
        bare.add(specifier);
        continue;
      }
      // The build rewrites relative specifiers to full paths with extensions,
      // so this resolves without probing for index files.
      queue.push(resolve(join(dirname(file), specifier)));
    }
  }

  return bare;
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
    const reachable = reachableBareSpecifiers(entryFile);
    checked += 1;

    for (const specifier of forbidden) {
      if (reachable.has(specifier)) {
        violations.push(
          `${packageName} "${exportKey}" (${relative(repoRoot, entryFile)}) reaches "${specifier}"`
        );
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
