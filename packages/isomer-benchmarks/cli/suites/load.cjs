/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What `require` of each public entry costs a fresh Node process, before any
// call into it: the SDK's own packages, then each config's entries.

const { join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '../..');

// Each package's public entries a host loads; `./testing` entries are for
// tests, and the Studio is a CLI, so neither is here.
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

const resolvesFrom = (dir, specifier) => {
  try {
    require.resolve(specifier, { paths: [dir] });
    return true;
  } catch {
    return false;
  }
};

/** A config's entry as a child loads it: the specifier, or the bundle a source entry becomes. */
const loadable = ({ dir, name, build = 'built' }, entries, entry) =>
  build === 'source'
    ? {
        source: entry,
        dir,
        outfile: join(
          dir,
          'node_modules/.cache/isomer-benchmarks',
          name,
          `${entries.indexOf(entry)}.cjs`
        ),
      }
    : entry;

const scenarios = async (configs) => [
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
  ...configs.flatMap((config) => {
    const { dir, name, entries, build = 'built' } = config;
    const from = build === 'source' ? ', bundled from source' : '';
    const hostable = SDK_AND_RUNTIME.every((each) => resolvesFrom(dir, each));
    if (!hostable) {
      process.stderr.write(
        `${name}: no \`${name}:host\` row, since the SDK and the runtime don't both resolve from ${dir}\n`
      );
    }
    return [
      ...entries.map((entry) => ({
        name: entry,
        about: from === '' ? '' : `\`${entry}\`${from}`,
        spec: { base: dir, load: [loadable(config, entries, entry)] },
      })),
      ...(hostable
        ? [
            {
              name: `${name}:host`,
              about: `the SDK, the runtime and \`${entries[0]}\`${from}`,
              spec: {
                base: dir,
                load: [
                  ...SDK_AND_RUNTIME,
                  loadable(config, entries, entries[0]),
                ],
              },
            },
          ]
        : []),
    ];
  }),
];

/** Bundles the source entries the picked scenarios load, once each. */
const prepare = async (picked) => {
  const { bundleSourceEntry } = require(join(PACKAGE, 'lib/cjs/index.js'));
  const bundles = new Map();
  for (const { spec } of picked) {
    for (const each of spec.load) {
      if (typeof each === 'object' && !bundles.has(each.outfile)) {
        bundles.set(
          each.outfile,
          bundleSourceEntry({
            entry: each.source,
            resolveDir: each.dir,
            outfile: each.outfile,
          })
        );
      }
    }
  }
  await Promise.all(bundles.values());
  return picked.map((scenario) => ({
    ...scenario,
    spec: {
      ...scenario.spec,
      load: scenario.spec.load.map((each) =>
        typeof each === 'object' ? each.outfile : each
      ),
    },
  }));
};

const mb = (bytes) => bytes / 1024 / 1024;

module.exports = {
  title: 'Loading each entry',
  about:
    "What `require` of each public entry costs a fresh Node process, as a CommonJS host loads it, before any call into it. Each row adds to `node`, the harness alone; an entry's row includes the packages it pulls in, so rows overlap and don't add up. Rows past the SDK's own packages come from each pack's config, resolved from that pack's directory; a pack bundled from source excludes what transpiling it would cost. `CJS modules` counts entries in `require.cache`; a CommonJS entry that loads ES modules adds modules it doesn't count.",
  usesConfigs: true,
  measures: [
    { key: 'loadMs', label: 'Load (ms)', digits: 0 },
    { key: 'modules', label: 'CJS modules', digits: 0 },
    { key: 'heapRetainedMb', label: 'Heap held (MB)', digits: 1 },
    { key: 'rssMb', label: 'RSS after (MB)', digits: 0 },
    { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
  ],
  scenarios,
  prepare,
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
