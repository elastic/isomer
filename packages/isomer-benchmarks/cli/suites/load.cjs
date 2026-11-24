/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What `require` of each public entry costs a fresh Node process, before any
// call into it.

const ENTRIES = {
  '@elastic/isomer-sdk': [
    '.',
    './schema',
    './html',
    './slack',
    './text',
    './markdown',
    './react',
    './author',
  ],
  '@elastic/isomer-runtime': ['.'],
  '@elastic/isomer-agent-tools': ['.'],
  '@elastic/isomer-image-takumi': ['.'],
  '@elastic/isomer-primitives-charts': [
    '.',
    './schema',
    './scene',
    './resolve',
  ],
  '@elastic/isomer-charts-elastic': ['.', './engine'],
  '@elastic/isomer-primitives-slides': ['.'],
};

const specifier = (name, entry) =>
  entry === '.' ? name : `${name}/${entry.slice(2)}`;

const HOSTS = {
  'host:image': {
    about:
      'what a server that draws images loads: the SDK, the runtime, the charts pack and takumi',
    specifiers: [
      '@elastic/isomer-sdk',
      '@elastic/isomer-runtime',
      '@elastic/isomer-primitives-charts',
      '@elastic/isomer-image-takumi',
    ],
  },
  'host:agent': {
    about:
      'what an agent host loads: the SDK, the runtime, agent-tools and the slides pack',
    specifiers: [
      '@elastic/isomer-sdk',
      '@elastic/isomer-runtime',
      '@elastic/isomer-agent-tools',
      '@elastic/isomer-primitives-slides',
    ],
  },
};

const PLAN = {
  node: { about: 'nothing: what the harness itself holds', specifiers: [] },
  ...Object.fromEntries(
    Object.entries(ENTRIES).flatMap(([name, entries]) =>
      entries.map((entry) => {
        const id = specifier(name, entry);
        return [id, { about: '', specifiers: [id] }];
      })
    )
  ),
  ...HOSTS,
};

const mb = (bytes) => bytes / 1024 / 1024;

module.exports = {
  title: 'Loading each entry',
  about:
    "What `require` of each public entry costs a fresh Node process, as a CommonJS host loads it, before any call into it. Each row adds to `node`, the harness alone; an entry's row includes the packages it pulls in, so rows overlap and don't add up.",
  measures: [
    { key: 'loadMs', label: 'Load (ms)', digits: 0 },
    { key: 'modules', label: 'Modules', digits: 0 },
    { key: 'heapRetainedMb', label: 'Heap held (MB)', digits: 1 },
    { key: 'rssMb', label: 'RSS after (MB)', digits: 0 },
    { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
  ],
  scenarios: Object.entries(PLAN).map(([name, { about }]) => ({ name, about })),
  run: async (scenario) => {
    const { specifiers } = PLAN[scenario];
    global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const modulesBefore = Object.keys(require.cache).length;
    const started = process.hrtime.bigint();
    const loaded = specifiers.map((id) => require(id));
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
