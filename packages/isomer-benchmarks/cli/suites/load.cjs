/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What `require` of each public entry costs a fresh Node process, before any
// call into it: the SDK's own packages, then each config's entries.

const { mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');

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

const SDK_AND_RUNTIME = ['@elastic/isomer-sdk', '@elastic/isomer-runtime'];

const CORE_HOSTS = {
  'host:image': {
    about:
      'what a server that draws images needs besides a pack: the SDK, the runtime and takumi',
    specifiers: [...SDK_AND_RUNTIME, '@elastic/isomer-image-takumi'],
  },
  'host:agent': {
    about:
      'what an agent host needs besides a pack: the SDK, the runtime and agent-tools',
    specifiers: [...SDK_AND_RUNTIME, '@elastic/isomer-agent-tools'],
  },
};

const fileName = (specifier) => specifier.replace(/[^a-z0-9-]+/gi, '_');

/**
 * Bundles each TypeScript entry to one CommonJS file beside the config's
 * `node_modules`, so what it imports from built JavaScript still resolves
 * there. Only TypeScript is bundled; built JavaScript stays external.
 */
const bundleSource = async ({ dir, name, entries }) => {
  const { build } = require('esbuild');
  const out = join(dir, 'node_modules/.cache/isomer-benchmarks', name);
  mkdirSync(out, { recursive: true });
  const keepBuiltExternal = {
    name: 'keep-built-external',
    setup: (esbuild) => {
      esbuild.onResolve({ filter: /^[^./]/ }, async (args) => {
        if (args.pluginData === 'resolving') {
          return undefined;
        }
        const found = await esbuild.resolve(args.path, {
          kind: args.kind,
          resolveDir: args.resolveDir,
          pluginData: 'resolving',
        });
        if (found.errors.length > 0) {
          return { errors: found.errors };
        }
        return found.external || !/\.[mc]?tsx?$/.test(found.path)
          ? { path: args.path, external: true }
          : found;
      });
    },
  };
  return Object.fromEntries(
    await Promise.all(
      entries.map(async (entry) => {
        const outfile = join(out, `${fileName(entry)}.cjs`);
        await build({
          stdin: {
            contents: `module.exports = require(${JSON.stringify(entry)});`,
            resolveDir: dir,
            loader: 'js',
          },
          bundle: true,
          platform: 'node',
          format: 'cjs',
          jsx: 'automatic',
          outfile,
          logLevel: 'silent',
          plugins: [keepBuiltExternal],
        });
        return [entry, outfile];
      })
    )
  );
};

const scenarios = async (configs) => {
  const core = [
    {
      name: 'node',
      about: 'nothing: what the harness itself holds',
      spec: { base: PACKAGE, load: [] },
    },
    ...CORE.map((specifier) => ({
      name: specifier,
      about: '',
      spec: { base: PACKAGE, load: [specifier] },
    })),
    ...Object.entries(CORE_HOSTS).map(([name, { about, specifiers }]) => ({
      name,
      about,
      spec: { base: PACKAGE, load: specifiers },
    })),
  ];
  const packs = await Promise.all(
    configs.map(async (config) => {
      const { dir, name, entries, build = 'built' } = config;
      const bundled = build === 'source' ? await bundleSource(config) : {};
      const target = (entry) => bundled[entry] ?? entry;
      const from = build === 'source' ? ', bundled from source' : '';
      return [
        ...entries.map((entry) => ({
          name: entry,
          about: from === '' ? '' : `\`${entry}\`${from}`,
          spec: { base: dir, load: [target(entry)] },
        })),
        {
          name: `${name}:host`,
          about: `the SDK, the runtime and \`${entries[0]}\`${from}`,
          spec: { base: dir, load: [...SDK_AND_RUNTIME, target(entries[0])] },
        },
      ];
    })
  );
  return [...core, ...packs.flat()];
};

const mb = (bytes) => bytes / 1024 / 1024;

module.exports = {
  title: 'Loading each entry',
  about:
    "What `require` of each public entry costs a fresh Node process, as a CommonJS host loads it, before any call into it. Each row adds to `node`, the harness alone; an entry's row includes the packages it pulls in, so rows overlap and don't add up. Rows past the SDK's own packages come from each pack's config, resolved from that pack's directory; a pack bundled from source excludes what transpiling it would cost.",
  measures: [
    { key: 'loadMs', label: 'Load (ms)', digits: 0 },
    { key: 'modules', label: 'Modules', digits: 0 },
    { key: 'heapRetainedMb', label: 'Heap held (MB)', digits: 1 },
    { key: 'rssMb', label: 'RSS after (MB)', digits: 0 },
    { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
  ],
  scenarios,
  run: async ({ base, load }) => {
    const { createRequire } = require('node:module');
    const requireFrom = createRequire(join(base, 'noop.js'));
    global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const modulesBefore = Object.keys(require.cache).length;
    const started = process.hrtime.bigint();
    const loaded = load.map((id) => requireFrom(id));
    const loadMs = Number(process.hrtime.bigint() - started) / 1e6;
    global.gc();
    const { heapUsed, rss } = process.memoryUsage();
    return {
      loadMs,
      modules: Object.keys(require.cache).length - modulesBefore,
      heapRetainedMb: mb(heapUsed - heapBefore),
      rssMb: mb(rss),
      held: loaded.length,
    };
  },
};
