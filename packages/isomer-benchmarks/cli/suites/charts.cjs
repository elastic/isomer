/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What drawing charts costs a server, as a render service draws them: validate,
// resolve each chart's Scene, draw it with an engine and rasterize it with
// takumi, with Inter Latin registered once. Each scenario stops at one stage:
// `resolve`, the whole `snapshot` surface, or PNG.

const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '../..');
const HOUR = 3_600_000;
const PANELS = 40;
const BURST = 16;

/** The rows a charts pack's config gets, drawn with no engine. */
const PACK_ROWS = [
  {
    name: 'resolve',
    about:
      'every metric and xy example, light and dark: validate and resolve each Scene',
    spec: { stage: 'resolve', jobs: 'examples' },
  },
  {
    name: 'resolve-budget',
    about:
      "one xy line at the pack's whole input budget: validate and resolve its Scene",
    spec: { stage: 'resolve', jobs: 'budget-xy' },
  },
  {
    name: 'baseline',
    about:
      'every metric and xy example, light and dark, to PNG at 1× with no engine: the summary fallback',
    spec: { stage: 'png', jobs: 'examples' },
  },
  {
    name: 'budget',
    about:
      "one xy line at the pack's whole input budget, to PNG at 2× with no engine",
    spec: { stage: 'png', jobs: 'budget-xy' },
  },
];

/** The rows an engine's config gets. The last is cheap, since `bench smoke` runs it. */
const ENGINE_ROWS = [
  {
    name: 'draw',
    about:
      'every metric and xy example, light and dark: validate, resolve and draw to snapshot markup',
    spec: { stage: 'draw', jobs: 'examples' },
  },
  {
    name: 'engine',
    about: 'every metric and xy example, light and dark, to PNG at 1×',
    spec: { stage: 'png', jobs: 'examples' },
  },
  {
    name: 'xy-quarter',
    about: "one xy line at a quarter of the pack's input budget, to PNG at 2×",
    spec: { stage: 'png', jobs: 'budget-xy', share: 0.25 },
  },
  {
    name: 'xy-half',
    about: "one xy line at half the pack's input budget, to PNG at 2×",
    spec: { stage: 'png', jobs: 'budget-xy', share: 0.5 },
  },
  {
    name: 'budget-draw',
    about:
      "one xy line at the pack's whole input budget: validate, resolve and draw to snapshot markup",
    spec: { stage: 'draw', jobs: 'budget-xy' },
  },
  {
    name: 'budget-xy',
    about: "one xy line at the pack's whole input budget, to PNG at 2×",
    spec: { stage: 'png', jobs: 'budget-xy' },
  },
  {
    name: 'budget-grid',
    about: `${PANELS} xy panels in a grid sharing the whole input budget, to PNG at 2×`,
    spec: { stage: 'png', jobs: 'budget-grid' },
  },
  {
    name: 'burst-limited',
    about: `${BURST} xy PNGs at 2× requested at once, through a limiter of 2`,
    spec: { stage: 'png', jobs: 'burst', limit: 2 },
  },
  {
    name: 'burst-unlimited',
    about: `${BURST} xy PNGs at 2× requested at once, no limiter`,
    spec: { stage: 'png', jobs: 'burst' },
  },
  {
    name: 'one',
    about: 'one cold xy PNG at 2×, the one-off case',
    spec: { stage: 'png', jobs: 'one' },
  },
];

const scenarios = async (configs) =>
  configs.flatMap(({ name, dir, charts }) => {
    if (charts === undefined) {
      return [];
    }
    const engine =
      charts.engine === undefined ? null : resolve(dir, charts.engine);
    return (engine === null ? PACK_ROWS : ENGINE_ROWS).map((row) => ({
      name: `${name}:${row.name}`,
      about: row.about,
      spec: { base: dir, engine, ...row.spec },
    }));
  });

const mb = (bytes) => bytes / 1024 / 1024;
const ms = (from) => Number(process.hrtime.bigint() - from) / 1e6;
const median = (list) =>
  list.length === 0
    ? undefined
    : [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

/** Every object, array and leaf counts once, as the SDK's input budget counts. */
const countValues = (value) =>
  value !== null && typeof value === 'object'
    ? 1 + Object.values(value).reduce((n, each) => n + countValues(each), 0)
    : 1;

/** The ids of a generated composition's charts: its body's, or a grid's panels'. */
const chartIds = ({ body }) =>
  body.flatMap((node) =>
    node.type === 'grid'
      ? node.panels.map(({ node: panel }) => panel.id)
      : [node.id]
  );

/** A new task, so the charts pack's per-task scene cache can't serve one render's Scene to the next. */
const nextTask = () => new Promise((done) => setImmediate(done));

const run = async ({
  base,
  engine,
  stage,
  jobs: shape,
  share = 1,
  limit: inFlight,
}) => {
  const started = process.hrtime.bigint();
  const requireFrom = createRequire(join(base, 'noop.js'));
  const { createIsomerRuntime } = requireFrom('@elastic/isomer-runtime');
  const { primitiveExamples } = requireFrom('@elastic/isomer-sdk');
  const { chartsFrame, createChartsPack, xyChartExamples } = requireFrom(
    '@elastic/isomer-primitives-charts'
  );
  const { resolveChart } = requireFrom(
    '@elastic/isomer-primitives-charts/resolve'
  );
  const { createRenderers, stylesheet } =
    engine === null ? { createRenderers: () => [] } : require(engine);
  // Its own file: the package's main entry would load more than the suite measures.
  const { limit } = require(join(PACKAGE, 'lib/cjs/limit.js'));
  // The charts the engine drew in the current snapshot, so a row it doesn't draw every chart in fails instead of passing its bound.
  let drawnIds = new Set();
  const counted = (renderer) => ({
    get id() {
      return renderer.id;
    },
    get environments() {
      return renderer.environments;
    },
    get sized() {
      return renderer.sized;
    },
    get fluid() {
      return renderer.fluid;
    },
    supports: (kind) => renderer.supports(kind),
    render: (scene, env) => {
      const drawing = renderer.render(scene, env);
      if (drawing !== null && drawing !== undefined && drawing !== false) {
        drawnIds.add(env.nodeId);
      }
      return drawing;
    },
  });

  const takumi =
    stage === 'png'
      ? requireFrom('@elastic/isomer-image-takumi').createTakumiImageBackend({
          fonts: [400, 500, 600, 700].map((weight) => ({
            name: 'Inter',
            weight,
            style: 'normal',
            data: () =>
              readFileSync(
                require.resolve(
                  `@fontsource/inter/files/inter-latin-${weight}-normal.woff2`,
                  { paths: [PACKAGE] }
                )
              ),
          })),
        })
      : null;
  // A chart that fails would draw its small failure note and pass any bound.
  const pack = createChartsPack({
    sceneRenderers: createRenderers().map(counted),
    onFailure: (error) => {
      throw error;
    },
  });
  const runtime = createIsomerRuntime({
    packs: [pack],
    frames: { charts: chartsFrame },
    ...(takumi === null ? {} : { formats: takumi.formats }),
  });

  const xyNode = xyChartExamples[0].node;
  const withRows = (count) => ({
    ...xyNode,
    data: {
      ...xyNode.data,
      rows: Array.from({ length: count }, (_, index) => [
        index * HOUR,
        Math.round(100 + 50 * Math.sin(index / 40) + ((index * 7919) % 23)),
      ]),
    },
  });
  /** The most rows `build(rows)` takes within `share` of the pack's input budget; each row is three values. */
  const atBudget = (build) =>
    build(
      Math.floor((pack.inputBudget.values * share - countValues(build(0))) / 3)
    );
  const grid = (rows) => ({
    type: 'view',
    body: [
      {
        type: 'grid',
        panels: Array.from({ length: PANELS }, (_, index) => ({
          x: (index % 4) * 12,
          y: Math.floor(index / 4) * 8,
          w: 12,
          h: 8,
          node: {
            ...withRows(
              Math.floor(rows / PANELS) + (index < rows % PANELS ? 1 : 0)
            ),
            id: `panel-${index}`,
          },
        })),
      },
    ],
  });
  const xyAt2x = (count) =>
    Array.from({ length: count }, (_, index) => ({
      composition: {
        type: 'view',
        body: [
          {
            ...xyChartExamples[index % xyChartExamples.length].node,
            id: 'chart',
          },
        ],
      },
      theme: 'light',
      scale: 2,
    }));
  const buildJobs = {
    examples: () =>
      pack.primitives
        .filter(({ type }) => type === 'metric' || type === 'xyChart')
        .flatMap((definition) => primitiveExamples(definition))
        .flatMap(({ node }) =>
          ['light', 'dark'].map((theme) => ({
            composition: { type: 'view', body: [{ ...node, id: 'chart' }] },
            theme,
            scale: 1,
          }))
        ),
    'budget-xy': () => [
      {
        composition: atBudget((rows) => ({
          type: 'view',
          body: [{ ...withRows(rows), id: 'chart' }],
        })),
        theme: 'light',
        scale: 2,
      },
    ],
    'budget-grid': () => [
      { composition: atBudget(grid), theme: 'light', scale: 2 },
    ],
    burst: () => xyAt2x(BURST),
    one: () => xyAt2x(1),
  }[shape];

  // Fonts register on the first render; an empty one registers them, so what
  // is loaded includes them and nothing drawn.
  await takumi?.svg({ html: '<div></div>', css: '', width: 1, height: 1 });
  global.gc();
  const loadedRss = process.memoryUsage().rss;
  // Built after the sample, so `Render RSS` includes the request's own data, as a service holds it.
  const jobs = buildJobs();

  const validates = [];
  const scenes = [];
  const rasters = [];
  let pngBytes = 0;
  let firstChart;
  const render = async ({ composition, theme, scale }) => {
    await nextTask();
    const validateStart = process.hrtime.bigint();
    const validation = runtime.validate(composition);
    if (!validation.valid) {
      throw new Error(
        `invalid composition: ${JSON.stringify(validation.errors.slice(0, 3))}`
      );
    }
    validates.push(ms(validateStart));
    const sceneStart = process.hrtime.bigint();
    if (stage === 'resolve') {
      for (const node of validation.composition.body) {
        resolveChart(node, { scheme: theme });
      }
      scenes.push(ms(sceneStart));
    } else {
      drawnIds = new Set();
      const input = runtime.surfaces.snapshot.render(validation.composition, {
        theme,
        onValidationError: 'collect',
      });
      scenes.push(ms(sceneStart));
      const missed = chartIds(validation.composition).filter(
        (id) => !drawnIds.has(id)
      );
      if (engine !== null && missed.length > 0) {
        throw new Error(
          `the engine drew nothing for ${missed.length} of this composition's charts, such as ${missed[0]}`
        );
      }
      if (takumi !== null) {
        const rasterStart = process.hrtime.bigint();
        const fitted = await takumi.fit(
          stylesheet
            ? { ...input, css: `${stylesheet(theme)}\n${input.css}` }
            : input
        );
        const png = await takumi.png(fitted, { scale });
        rasters.push(ms(rasterStart));
        pngBytes = Math.max(pngBytes, png.length);
      }
    }
    firstChart ??= ms(started);
  };

  const allStart = process.hrtime.bigint();
  if (shape === 'burst') {
    const limited =
      inFlight === undefined ? (each) => each() : limit(inFlight, jobs.length);
    await Promise.all(jobs.map((job) => limited(() => render(job))));
  } else {
    for (const job of jobs) {
      await render(job);
    }
  }

  const allMs = ms(allStart);
  // `maxRSS` is in kilobytes. Sampled before the bookkeeping below, for both measures.
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  global.gc();
  return {
    peakRssMb,
    charts: jobs.length,
    values: Math.max(
      ...jobs.map(({ composition }) => countValues(composition))
    ),
    loadedRssMb: mb(loadedRss),
    renderRssMb: peakRssMb - mb(loadedRss),
    heapAfterGcMb: mb(process.memoryUsage().heapUsed),
    coldStartMs: firstChart,
    allMs,
    validateMs: median(validates),
    sceneMs: median(scenes),
    ...(takumi === null
      ? {}
      : { rasterMs: median(rasters), pngKb: pngBytes / 1024 }),
  };
};

module.exports = {
  title: 'Drawing charts',
  about:
    "What drawing charts costs a fresh Node process, as a render service draws them: validate, resolve each chart's Scene, draw it with an engine, and rasterize it with takumi to PNG, with Inter Latin registered once. Rows come from each charts pack's config, drawn with no engine, and each engine's config; an engine row fails unless the engine draws every chart. A `resolve` row calls `resolveChart` once per chart. Every other row renders the `snapshot` surface, which validates again and may resolve a chart more than once, so its `Resolve, or snapshot` column is the whole surface: compare an engine row with the no-engine row over the same charts for what the engine adds. `Loaded RSS` is after loading and registering fonts, before the request's data is built; `Render RSS` is the peak above it. Per-chart times are medians; `All charts` runs from the first render's start to the last one's end. Each render starts in a new task, as a request does.",
  usesConfigs: true,
  measures: [
    { key: 'charts', label: 'Charts', digits: 0 },
    { key: 'values', label: 'Input values, largest', digits: 0 },
    { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
    { key: 'loadedRssMb', label: 'Loaded RSS (MB)', digits: 0 },
    { key: 'renderRssMb', label: 'Render RSS (MB)', digits: 0 },
    { key: 'heapAfterGcMb', label: 'Heap after (MB)', digits: 1 },
    { key: 'coldStartMs', label: 'First chart (ms)', digits: 0 },
    { key: 'allMs', label: 'All charts (ms)', digits: 0 },
    { key: 'validateMs', label: 'Validate (ms)', digits: 1 },
    { key: 'sceneMs', label: 'Resolve, or snapshot (ms)', digits: 1 },
    { key: 'rasterMs', label: 'PNG (ms)', digits: 1 },
    { key: 'pngKb', label: 'PNG (KB)', digits: 0 },
  ],
  scenarios,
  run,
};
