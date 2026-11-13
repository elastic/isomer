/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Measures what drawing charts on a server costs, as a render service draws
// them: validation, the charts pack's `snapshot` surface, a chart engine and
// takumi to PNG, on one shared backend with Inter Latin registered once. Each
// run is a fresh Node process, so cold start and peak memory are the
// process's own.
//
//   node scripts/bench_charts.cjs [--engine <module>] [--scenarios a,b] [--runs 4] [--repeat 1] [--values n] [--cache-max-bytes n] [--json] [--check]
//
// `--engine` names a CommonJS module exporting `{ createRenderers, bounds }`:
// the scene renderers to draw with, and the ceilings `--check` holds each
// scenario's median run to, in MB. Without one, only the no-engine scenarios
// run, held to `PACK_BOUNDS`. `--check` runs the bounded scenarios and fails
// when a median exceeds its bound or nothing is bounded; with `--json`, its
// report goes to stderr. Run `pnpm build` first: this loads the
// built CommonJS packages, as a Node host does.

const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

/**
 * What each scenario draws. `engine: false` draws with no chart engine (the
 * pack's summary fallback), so the difference is the engine's.
 */
const SCENARIOS = {
  baseline: {
    about: 'every metric and xy example, light and dark, at 1×, no engine',
    engine: false,
  },
  budget: {
    about:
      "one xy line at the charts pack's whole input budget, at 2×, no engine",
    engine: false,
  },
  engine: {
    about: 'every metric and xy example, light and dark, at 1×',
  },
  one: { about: 'one cold xy PNG at 2×, the one-off case' },
  'budget-xy': {
    about: "one xy line at the charts pack's whole input budget, at 2×",
  },
  'budget-grid': {
    about: '40 xy panels in a grid sharing the whole input budget, at 2×',
  },
  'burst-limited': {
    about: '16 xy PNGs at 2× requested at once, through a limiter of 2',
  },
  'burst-unlimited': {
    about: '16 xy PNGs at 2× requested at once, no limiter',
  },
};

/**
 * The ceilings `--check` holds the no-engine scenarios to, in MB: what the
 * charts pack costs by itself. Each is about twice what Node 22 measures on
 * arm64 macOS, to hold across platforms and still catch a doubling.
 */
const PACK_BOUNDS = {
  baseline: { peakRssMb: 280 },
  budget: { peakRssMb: 900, renderRssMb: 800 },
};

const mb = (bytes) => bytes / 1024 / 1024;

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * The limiter the image-takumi docs give hosts: at most `inFlight` renders at
 * once, at most `queued` waiting, and past that a `busy` error. A finishing
 * render hands its slot straight to the next waiting one, so a call that lands
 * in between cannot take it too.
 */
const limit = (inFlight, queued) => {
  let running = 0;
  const waiting = [];
  return async (render) => {
    if (running < inFlight) {
      running += 1;
    } else {
      if (waiting.length >= queued) {
        throw new Error('busy');
      }
      await new Promise((resolve) => waiting.push(resolve));
    }
    try {
      return await render();
    } finally {
      const next = waiting.shift();
      if (next) {
        next();
      } else {
        running -= 1;
      }
    }
  };
};

/**
 * Each bounded measure's median over the scenario's runs, against `bounds`:
 * `peakRssMb` is the process's high-water mark, `renderRssMb` that peak less
 * the RSS once everything is loaded and the fonts are registered.
 */
const checkBounds = (results, scenarios, bounds) =>
  scenarios.flatMap((scenario) =>
    Object.entries(bounds[scenario] ?? {}).map(([key, bound]) => {
      const values = results
        .filter((result) => result.scenario === scenario)
        .map((result) => result[key]);
      if (values.length === 0) {
        throw new Error(`${scenario}: no runs to check`);
      }
      const value = median(values);
      return {
        scenario,
        key,
        median: value,
        bound,
        ok: value <= bound,
        line: `${scenario} ${key}: median ${value.toFixed(0)} MB, bound ${bound} MB`,
      };
    })
  );

const child = async (scenario, engine, repeat, cacheMaxBytes, budgetValues) => {
  const started = process.hrtime.bigint();
  const ms = (from, to = process.hrtime.bigint()) => Number(to - from) / 1e6;

  const { createIsomerRuntime } = require('@elastic/isomer-runtime');
  const { primitiveExamples } = require('@elastic/isomer-sdk');
  const {
    chartsFrame,
    createChartsPack,
    xyChartExamples,
  } = require('@elastic/isomer-primitives-charts');
  const { createTakumiImageBackend } = require('@elastic/isomer-image-takumi');
  const sceneRenderers =
    SCENARIOS[scenario].engine === false
      ? []
      : require(engine).createRenderers();

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
  const takumi = createTakumiImageBackend({
    fonts,
    ...(cacheMaxBytes === undefined ? {} : { cacheMaxBytes }),
  });
  const pack = createChartsPack({ sceneRenderers });
  const runtime = createIsomerRuntime({
    packs: [pack],
    frames: { charts: chartsFrame },
    formats: takumi.formats,
  });

  const xyNode = xyChartExamples[0].node;
  const HOUR = 3_600_000;
  const withRows = (count, offset = 0) => ({
    ...xyNode,
    data: {
      ...xyNode.data,
      rows: Array.from({ length: count }, (_, index) => [
        (offset + index) * HOUR,
        Math.round(100 + 50 * Math.sin(index / 40) + ((index * 7919) % 23)),
      ]),
    },
  });
  // Every object, array and leaf counts once, as the SDK's input budget counts.
  const countValues = (value) =>
    value !== null && typeof value === 'object'
      ? 1 + Object.values(value).reduce((n, v) => n + countValues(v), 0)
      : 1;
  /** The most rows `build(rows)` takes within the pack's input budget; each row is three values. */
  const atBudget = (build) => {
    const base = countValues(build(0));
    return build(
      Math.floor(((budgetValues ?? pack.inputBudget.values) - base) / 3)
    );
  };
  const PANELS = 40;
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
          node: withRows(
            Math.floor(rows / PANELS) + (index < rows % PANELS ? 1 : 0)
          ),
        })),
      },
    ],
  });

  const examples = () =>
    pack.primitives
      .filter(({ type }) => type === 'metric' || type === 'xyChart')
      .flatMap((definition) => primitiveExamples(definition))
      .flatMap(({ node }) =>
        ['light', 'dark'].map((theme) => ({
          composition: { type: 'view', body: [node] },
          theme,
          scale: 1,
        }))
      );
  const xyAt2x = (count) =>
    Array.from({ length: count }, (_, index) => ({
      composition: {
        type: 'view',
        body: [xyChartExamples[index % xyChartExamples.length].node],
      },
      theme: 'light',
      scale: 2,
    }));

  const budgetXy = () => [
    {
      composition: atBudget((rows) => ({
        type: 'view',
        body: [withRows(rows)],
      })),
      theme: 'light',
      scale: 2,
    },
  ];

  const jobs = {
    baseline: examples,
    engine: examples,
    one: () => xyAt2x(1),
    budget: budgetXy,
    'budget-xy': budgetXy,
    'budget-grid': () => [
      { composition: atBudget(grid), theme: 'light', scale: 2 },
    ],
    'burst-limited': () => xyAt2x(16),
    'burst-unlimited': () => xyAt2x(16),
  }[scenario]();
  const values = Math.max(...jobs.map((job) => countValues(job.composition)));

  // Fonts register on the first render; an empty one registers them, so what
  // is "loaded" includes them and nothing drawn.
  await takumi.svg({ html: '<div></div>', css: '', width: 1, height: 1 });
  global.gc();
  const loadedRss = process.memoryUsage().rss;

  const draws = [];
  const rasters = [];
  let pngBytes = 0;
  let size;
  let firstChart;
  const render = async ({ composition, theme, scale }) => {
    const drawStart = process.hrtime.bigint();
    const validation = runtime.validate(composition);
    if (!validation.valid) {
      throw new Error(
        `${scenario}: invalid composition: ${JSON.stringify(validation.errors.slice(0, 3))}`
      );
    }
    const input = runtime.surfaces.snapshot.render(validation.composition, {
      theme,
      onValidationError: 'collect',
    });
    draws.push(ms(drawStart));
    const rasterStart = process.hrtime.bigint();
    const fitted = await takumi.fit(input);
    const png = await takumi.png(fitted, { scale });
    rasters.push(ms(rasterStart));
    pngBytes = Math.max(pngBytes, png.length);
    size ??= `${fitted.width}×${fitted.height}`;
    firstChart ??= ms(started);
  };

  const all = Array.from({ length: repeat }, () => jobs).flat();
  if (scenario === 'burst-unlimited') {
    await Promise.all(all.map(render));
  } else if (scenario === 'burst-limited') {
    const limited = limit(2, all.length);
    await Promise.all(all.map((job) => limited(() => render(job))));
  } else {
    for (const job of all) {
      await render(job);
    }
  }

  // `maxRSS` is in kilobytes.
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  global.gc();
  process.stdout.write(
    JSON.stringify({
      scenario,
      charts: all.length,
      values,
      size,
      coldStartMs: firstChart,
      drawMedianMs: median(draws),
      rasterMedianMs: median(rasters),
      totalMs: ms(started),
      loadedRssMb: mb(loadedRss),
      peakRssMb,
      renderRssMb: peakRssMb - mb(loadedRss),
      heapAfterGcMb: mb(process.memoryUsage().heapUsed),
      pngKb: pngBytes / 1024,
    })
  );
};

const parent = () => {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const at = args.indexOf(name);
    return at === -1 ? fallback : args[at + 1];
  };
  const check = args.includes('--check');
  const enginePath = option('--engine', undefined);
  const engine = enginePath === undefined ? undefined : resolve(enginePath);
  const bounds = engine === undefined ? PACK_BOUNDS : require(engine).bounds;
  const runs = Number(option('--runs', check ? 3 : 4));
  const repeat = Number(option('--repeat', 1));
  const cacheMaxBytes = option('--cache-max-bytes', undefined);
  const budgetValues = option('--values', undefined);
  const available = Object.keys(SCENARIOS).filter(
    (scenario) => engine !== undefined || SCENARIOS[scenario].engine === false
  );
  const scenarios = option(
    '--scenarios',
    (check ? Object.keys(bounds) : available).join(',')
  ).split(',');
  for (const scenario of scenarios) {
    if (!available.includes(scenario)) {
      throw new Error(
        `${scenario}: ${scenario in SCENARIOS ? 'needs --engine' : 'unknown scenario'}`
      );
    }
  }

  const results = scenarios.flatMap((scenario) =>
    Array.from({ length: runs }, () => {
      const run = spawnSync(
        process.execPath,
        [
          '--disallow-code-generation-from-strings',
          '--expose-gc',
          __filename,
          '--child',
          scenario,
          engine ?? '',
          String(repeat),
          cacheMaxBytes ?? '',
          budgetValues ?? '',
        ],
        { encoding: 'utf8', maxBuffer: 1 << 24 }
      );
      if (run.status !== 0) {
        throw new Error(`${scenario} run failed:\n${run.stderr}`);
      }
      return JSON.parse(run.stdout);
    })
  );
  const of = (scenario, key) =>
    results.filter((result) => result.scenario === scenario).map((r) => r[key]);
  const json = args.includes('--json');

  if (json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } else {
    const range = (scenario, key, digits) => {
      const list = of(scenario, key);
      const low = Math.min(...list).toFixed(digits);
      const high = Math.max(...list).toFixed(digits);
      return low === high ? low : `${low}–${high}`;
    };
    const rows = [
      ['Charts per run', 'charts', 0],
      ['Input values, largest composition', 'values', 0],
      ['Peak RSS (MB)', 'peakRssMb', 0],
      ['RSS loaded, fonts registered (MB)', 'loadedRssMb', 0],
      ['Peak RSS less loaded (MB)', 'renderRssMb', 0],
      ['Heap held after the run and a GC (MB)', 'heapAfterGcMb', 1],
      ['Cold start to first PNG (ms)', 'coldStartMs', 0],
      ['Validate and draw per chart, median (ms)', 'drawMedianMs', 1],
      ['takumi PNG per chart, median (ms)', 'rasterMedianMs', 1],
      ['Largest PNG (KB)', 'pngKb', 0],
      ['Total (ms)', 'totalMs', 0],
    ];
    process.stdout.write(
      [
        `${runs} runs per scenario, ${repeat}× each, Node ${process.version}, ${process.platform} ${process.arch}${cacheMaxBytes === undefined ? '' : `, cacheMaxBytes ${cacheMaxBytes}`}`,
        '',
        ...scenarios.map(
          (scenario) => `- \`${scenario}\`: ${SCENARIOS[scenario].about}`
        ),
        '',
        `| Measure | ${scenarios.join(' | ')} |`,
        `| --- | ${scenarios.map(() => '---').join(' | ')} |`,
        ...rows.map(
          ([label, key, digits]) =>
            `| ${label} | ${scenarios.map((scenario) => range(scenario, key, digits)).join(' | ')} |`
        ),
        '',
      ].join('\n')
    );
  }

  if (check) {
    const checks = checkBounds(results, scenarios, bounds);
    // With `--json`, stdout stays one JSON document.
    const report = json ? process.stderr : process.stdout;
    for (const { ok, line } of checks) {
      report.write(`${ok ? '✓' : '✗'} ${line}\n`);
    }
    if (checks.length === 0) {
      process.stderr.write('No scenario has a bound to check.\n');
      process.exitCode = 1;
    }
    const failures = checks.filter(({ ok }) => !ok);
    if (failures.length > 0) {
      process.stderr.write(
        `Over the memory budget:\n${failures.map(({ line }) => line).join('\n')}\n`
      );
      process.exitCode = 1;
    }
  }
};

module.exports = { PACK_BOUNDS, checkBounds, limit };

if (require.main === module) {
  if (process.argv[2] === '--child') {
    const [scenario, engine, repeat, cacheMaxBytes, budgetValues] =
      process.argv.slice(3);
    const number = (arg) => (arg ? Number(arg) : undefined);
    child(
      scenario,
      engine,
      Number(repeat),
      number(cacheMaxBytes),
      number(budgetValues)
    ).catch((error) => {
      process.stderr.write(`${error.stack}\n`);
      process.exit(1);
    });
  } else {
    parent();
  }
}
