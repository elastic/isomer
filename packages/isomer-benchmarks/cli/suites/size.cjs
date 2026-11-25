/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What each public entry costs a host that bundles it: esbuild bundles the
// entry's ESM build, minified, for Node and for the browser.

const { existsSync, readFileSync } = require('node:fs');
const { builtinModules } = require('node:module');
const { dirname, join, resolve } = require('node:path');
const { gzipSync } = require('node:zlib');

const PACKAGE = resolve(__dirname, '../..');

const CORE = [
  '@elastic/isomer-sdk',
  '@elastic/isomer-sdk/schema',
  '@elastic/isomer-sdk/html',
  '@elastic/isomer-sdk/slack',
  '@elastic/isomer-sdk/text',
  '@elastic/isomer-sdk/markdown',
  '@elastic/isomer-sdk/react',
  '@elastic/isomer-sdk/author',
  '@elastic/isomer-runtime',
  '@elastic/isomer-agent-tools',
  '@elastic/isomer-image-takumi',
];

/** What every host brings itself: Isomer's own peers. */
const HOST_PROVIDED = ['react', 'react-dom', 'zod'];

const manifestCache = new Map();

/** The nearest `package.json` above `file` that names a package. */
const owningManifest = (file) => {
  let dir = dirname(file);
  const seen = [];
  for (;;) {
    if (manifestCache.has(dir)) {
      const found = manifestCache.get(dir);
      seen.forEach((each) => manifestCache.set(each, found));
      return found;
    }
    seen.push(dir);
    const path = join(dir, 'package.json');
    if (existsSync(path)) {
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof manifest.name === 'string') {
        seen.forEach((each) => manifestCache.set(each, manifest));
        return manifest;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      seen.forEach((each) => manifestCache.set(each, null));
      return null;
    }
    dir = parent;
  }
};

/** Bytes in the output, per package that owns the input. */
const byPackage = (metafile, cwd) => {
  // No prototype, so a package named `constructor` starts from nothing too.
  const totals = Object.create(null);
  for (const output of Object.values(metafile.outputs)) {
    for (const [input, { bytesInOutput }] of Object.entries(output.inputs)) {
      if (input === '<stdin>') {
        continue;
      }
      const name = owningManifest(resolve(cwd, input))?.name ?? '(other)';
      totals[name] = (totals[name] ?? 0) + bytesInOutput;
    }
  }
  return totals;
};

const bundle = async ({ build }, { base, entry, platform, external }) => {
  const result = await build({
    stdin: {
      contents: `export * from ${JSON.stringify(entry)};`,
      resolveDir: base,
      loader: 'js',
    },
    absWorkingDir: base,
    bundle: true,
    minify: true,
    format: 'esm',
    platform,
    jsx: 'automatic',
    write: false,
    metafile: true,
    logLevel: 'silent',
    external: [
      ...external,
      ...external.map((name) => `${name}/*`),
      ...(platform === 'node'
        ? []
        : [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]),
    ],
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const [output] = result.outputFiles;
  return {
    bytes: output.contents.byteLength,
    gzipBytes: gzipSync(output.contents).byteLength,
    packages: byPackage(result.metafile, base),
  };
};

const kb = (bytes) => bytes / 1024;

const scenarios = async (configs) => [
  ...CORE.map((entry) => ({
    name: entry,
    about: '',
    core: true,
    spec: { base: PACKAGE, entry, nodeOnly: entry.endsWith('image-takumi') },
  })),
  ...configs.flatMap(({ dir, entries, nodeOnly = [] }) =>
    entries.map((entry) => ({
      name: entry,
      about: '',
      spec: { base: dir, entry, nodeOnly: nodeOnly.includes(entry) },
    }))
  ),
];

/** The manifest of the package `entry` resolves into from `base`, a relative entry's included. */
const ownerOf = (base, entry) => {
  const { createRequire } = require('node:module');
  try {
    return owningManifest(createRequire(join(base, 'noop.js')).resolve(entry));
  } catch {
    return null;
  }
};

/** The largest packages in each entry's Node bundle besides the entry's own. */
const largestInputs = ({ runs }) => {
  const rows = runs.map(({ scenario, ownPackage, nodePackages }) => {
    const ranked = Object.entries(JSON.parse(nodePackages))
      .filter(([name]) => name !== ownPackage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, bytes]) => `\`${name}\` ${kb(bytes).toFixed(0)}`);
    return `| \`${scenario}\` | ${ranked.join(', ') || 'none'} |`;
  });
  return [
    "The largest other packages in each entry's Node bundle, in KB:",
    '',
    '| Entry | Largest other packages |',
    '| --- | --- |',
    ...rows,
  ].join('\n');
};

module.exports = {
  title: 'Bundling each entry',
  about:
    "What each public entry adds to a host that bundles it, such as a render service or a browser app: esbuild bundles the entry's ESM build, minified, with the entry's peers and React and zod left external, since the host brings them. A peer such as `@elastic/charts` is not counted. The browser column is empty for an entry that only runs on Node. Sizes don't vary between runs or machines.",
  deterministic: true,
  usesConfigs: true,
  measures: [
    { key: 'nodeKb', label: 'Node (KB)', digits: 1 },
    { key: 'nodeGzipKb', label: 'Node gzip (KB)', digits: 1 },
    { key: 'browserKb', label: 'Browser (KB)', digits: 1 },
    { key: 'browserGzipKb', label: 'Browser gzip (KB)', digits: 1 },
    { key: 'ownKb', label: 'Own code (KB)', digits: 1 },
  ],
  scenarios,
  /** The measures `--check` needs a bound for: every size the entry has. */
  mustBound: ({ spec }) =>
    spec.nodeOnly ? ['nodeKb'] : ['nodeKb', 'browserKb'],
  notes: (result) => [largestInputs(result)],
  run: async ({ base, entry, nodeOnly }) => {
    const esbuild = require('esbuild');
    const owner = ownerOf(base, entry);
    // A package's peers stay external: its host brings them.
    const external = [
      ...new Set([
        ...HOST_PROVIDED,
        ...Object.keys(owner?.peerDependencies ?? {}),
      ]),
    ];
    const node = await bundle(esbuild, {
      base,
      entry,
      platform: 'node',
      external,
    });
    const browser = nodeOnly
      ? undefined
      : await bundle(esbuild, { base, entry, platform: 'browser', external });
    const ownPackage = owner?.name ?? '';
    return {
      nodeKb: kb(node.bytes),
      nodeGzipKb: kb(node.gzipBytes),
      ...(browser === undefined
        ? {}
        : {
            browserKb: kb(browser.bytes),
            browserGzipKb: kb(browser.gzipBytes),
          }),
      ownKb: kb(node.packages[ownPackage] ?? 0),
      ownPackage,
      nodePackages: JSON.stringify(node.packages),
    };
  },
};
