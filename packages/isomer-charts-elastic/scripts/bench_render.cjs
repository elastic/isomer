/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Measures what drawing charts on a server costs: every metric and xyChart
// example, in light and dark, through the charts pack's `snapshot` surface and
// takumi to PNG, as a render service would. Each run is a fresh Node process,
// so cold start and peak memory are the process's own.
//
//   pnpm --filter @elastic/isomer-charts-elastic bench [--runs 4] [--repeat 1] [--json]
//
// `--repeat` draws the examples that many times in each process; peak memory
// that grows with it is held, not working, memory.
//
// Modes: `headless` draws with headless Elastic Charts; `baseline` draws the
// same compositions with no chart engine (the pack's summary fallback), so the
// difference is the engine's. Run `pnpm build` first: this loads the built
// CommonJS packages, as a Node host does.

const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const MODES = ['baseline', 'headless'];

const child = async (mode, repeat) => {
  const started = process.hrtime.bigint();
  const ms = (from, to = process.hrtime.bigint()) => Number(to - from) / 1e6;

  const { createIsomerRuntime } = require('@elastic/isomer-runtime');
  const { primitiveExamples } = require('@elastic/isomer-sdk');
  const {
    chartsFrame,
    createChartsPack,
  } = require('@elastic/isomer-primitives-charts');
  const { createTakumiImageBackend } = require('@elastic/isomer-image-takumi');
  const sceneRenderers =
    mode === 'headless'
      ? [
          require('@elastic/isomer-charts-elastic/headless').createElasticChartsHeadlessRenderer(),
        ]
      : [];

  const fonts = [400, 500, 600, 700].map((weight) => ({
    name: 'Inter',
    weight,
    style: 'normal',
    data: () =>
      readFileSync(
        require.resolve(
          `@fontsource/inter/files/inter-latin-${weight}-normal.woff2`
        )
      ),
  }));
  const takumi = createTakumiImageBackend({ fonts });
  const pack = createChartsPack({ sceneRenderers });
  const runtime = createIsomerRuntime({
    packs: [pack],
    frames: { charts: chartsFrame },
    formats: takumi.formats,
  });
  const examples = pack.primitives
    .filter(({ type }) => type === 'metric' || type === 'xyChart')
    .flatMap((definition) => primitiveExamples(definition))
    .flatMap(({ node }) =>
      ['light', 'dark'].map((theme) => ({
        composition: { type: 'view', body: [node] },
        theme,
      }))
    );
  const compositions = Array.from({ length: repeat }, () => examples).flat();

  const draws = [];
  const rasters = [];
  let firstChart;
  for (const { composition, theme } of compositions) {
    const drawStart = process.hrtime.bigint();
    const input = runtime.surfaces.snapshot.render(composition, { theme });
    draws.push(ms(drawStart));
    const rasterStart = process.hrtime.bigint();
    const fitted = takumi.fit ? await takumi.fit(input) : input;
    await takumi.png(fitted);
    rasters.push(ms(rasterStart));
    firstChart ??= ms(started);
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  process.stdout.write(
    JSON.stringify({
      mode,
      charts: compositions.length,
      coldStartMs: firstChart,
      drawMedianMs: median(draws),
      rasterMedianMs: median(rasters),
      totalMs: ms(started),
      // `maxRSS` is in kilobytes.
      peakRssMb: process.resourceUsage().maxRSS / 1024,
      heapAfterGcMb:
        (global.gc(), process.memoryUsage().heapUsed / 1024 / 1024),
    })
  );
};

const parent = () => {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const at = args.indexOf(name);
    return at === -1 ? fallback : Number(args[at + 1]);
  };
  const runs = option('--runs', 4);
  const repeat = option('--repeat', 1);
  const results = MODES.flatMap((mode) =>
    Array.from({ length: runs }, () => {
      const run = spawnSync(
        process.execPath,
        [
          '--disallow-code-generation-from-strings',
          '--expose-gc',
          __filename,
          '--child',
          mode,
          String(repeat),
        ],
        { encoding: 'utf8', maxBuffer: 1 << 24 }
      );
      if (run.status !== 0) {
        throw new Error(`${mode} run failed:\n${run.stderr}`);
      }
      return JSON.parse(run.stdout);
    })
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }
  const range = (mode, key, digits) => {
    const values = results
      .filter((result) => result.mode === mode)
      .map((result) => result[key]);
    return `${Math.min(...values).toFixed(digits)}–${Math.max(...values).toFixed(digits)}`;
  };
  const rows = [
    ['Peak RSS (MB)', 'peakRssMb', 0],
    ['Heap held after the run and a GC (MB)', 'heapAfterGcMb', 1],
    ['Cold start to first PNG (ms)', 'coldStartMs', 0],
    ['Draw per chart, median (ms)', 'drawMedianMs', 2],
    ['takumi PNG per chart, median (ms)', 'rasterMedianMs', 2],
    ['Total (ms)', 'totalMs', 0],
  ];
  process.stdout.write(
    [
      `${results[0].charts} charts per run (${repeat}× the examples), ${runs} runs per mode, Node ${process.version}, ${process.platform} ${process.arch}`,
      '',
      `| Measure | ${MODES.join(' | ')} |`,
      `| --- | ${MODES.map(() => '---').join(' | ')} |`,
      ...rows.map(
        ([label, key, digits]) =>
          `| ${label} | ${MODES.map((mode) => range(mode, key, digits)).join(' | ')} |`
      ),
      '',
    ].join('\n')
  );
};

if (process.argv[2] === '--child') {
  child(process.argv[3], Number(process.argv[4])).catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
  });
} else {
  parent();
}
