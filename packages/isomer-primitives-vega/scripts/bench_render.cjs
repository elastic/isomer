/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Measures what drawing Vega charts on a server costs, as a render service
// draws them: validation (which parses each spec), the pack's `snapshot`
// surface on `chartsFrame`, Vega's headless SVG and takumi to PNG, on one
// backend with Inter Latin registered once. Each run is a fresh Node process
// under `--disallow-code-generation-from-strings`, as Kibana's server runs.
//
//   pnpm --filter @elastic/isomer-primitives-vega bench [--scenarios a,b] [--runs 4] [--json]
//   pnpm --filter @elastic/isomer-primitives-vega bench:check
//
// Run `pnpm build` first: this loads the built CommonJS packages.

const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const SCENARIOS = {
  examples: { about: 'every Vega example, light and dark, at 1×' },
  one: { about: 'one cold Vega-Lite PNG at 2×, the one-off case' },
  'budget-marks': {
    about:
      'the worst image the pack draws: a scatter plot at the drawn-mark cap, at 2×',
  },
  'budget-spec': {
    about: 'one line through a spec at the character limit, at 2×',
  },
  'budget-data': {
    about: 'one line through `data` at the row limit, at 2×',
  },
  'over-marks': {
    about:
      'a scatter plot at the character limit, past the mark cap: drawn as a note',
  },
  'burst-limited': {
    about: '16 example PNGs at 2× requested at once, through a limiter of 2',
  },
};

/**
 * Ceilings `--check` holds each scenario's median run to, in MB: about 1.5×
 * the larger of macOS arm64 and CI's Linux x64 on Node 22, with a floor for
 * `one`'s small delta, so a runner's variance passes and a doubling fails.
 * Lower a bound when rendering gets cheaper; raise one only with Linux CI's
 * numbers beside it.
 */
const BOUNDS = {
  examples: { peakRssMb: 450, renderRssMb: 260 },
  one: { peakRssMb: 210, renderRssMb: 40 },
  'budget-marks': { peakRssMb: 550, renderRssMb: 100 },
  'budget-spec': { peakRssMb: 460, renderRssMb: 270 },
  'budget-data': { peakRssMb: 450, renderRssMb: 260 },
  'over-marks': { peakRssMb: 450, renderRssMb: 260 },
  'burst-limited': { peakRssMb: 460, renderRssMb: 270 },
};

const mb = (bytes) => bytes / 1024 / 1024;

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** At most `inFlight` renders at once; the image-takumi docs give hosts the same limiter. */
const limit = (inFlight) => {
  let running = 0;
  const waiting = [];
  return async (render) => {
    if (running < inFlight) {
      running += 1;
    } else {
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

const child = async (scenario) => {
  const started = process.hrtime.bigint();
  const ms = (from, to = process.hrtime.bigint()) => Number(to - from) / 1e6;

  const { createIsomerRuntime } = require('@elastic/isomer-runtime');
  const { chartsFrame } = require('@elastic/isomer-primitives-charts');
  const {
    MAX_DATA_ROWS,
    MAX_DRAWN_ITEMS,
    MAX_SPEC_CHARS,
    renderVegaSvg,
    toVegaSpec,
    VEGA_THEMES,
    vegaExamples,
    vegaPack,
  } = require('@elastic/isomer-primitives-vega');
  const { createTakumiImageBackend } = require('@elastic/isomer-image-takumi');

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
  const runtime = createIsomerRuntime({
    packs: [vegaPack],
    frames: { charts: chartsFrame },
    formats: takumi.formats,
  });

  const point = (index) => ({
    x: (index * 7919) % 10007,
    y: Math.round(5000 + 4000 * Math.sin(index / 50)),
  });
  const xy = (mark, values) => ({
    data: { values },
    mark,
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  });
  /** As many points as fit in the spec limit. */
  const atSpecLimit = (mark) => {
    const perPoint = JSON.stringify(point(12345)).length + 1;
    const base = JSON.stringify(xy(mark, [])).length;
    const count = Math.floor((MAX_SPEC_CHARS - base) / perPoint) - 100;
    return {
      type: 'vega',
      mode: 'vega-lite',
      description: `${count} points.`,
      spec: xy(
        mark,
        Array.from({ length: count }, (_, index) => point(index))
      ),
    };
  };
  /** The most points that draw: the cap, less the root group and the axes. */
  const atMarkLimit = () => {
    const probe = (count) => {
      const input = {
        mode: 'vega-lite',
        spec: xy(
          'point',
          Array.from({ length: count }, (_, i) => point(i))
        ),
        width: 480,
        height: 270,
      };
      try {
        renderVegaSvg(toVegaSpec(input, VEGA_THEMES.light), input);
        return true;
      } catch {
        return false;
      }
    };
    let low = 0;
    let high = MAX_DRAWN_ITEMS;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (probe(mid)) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return {
      type: 'vega',
      mode: 'vega-lite',
      description: `${low} points.`,
      spec: xy(
        'point',
        Array.from({ length: low }, (_, index) => point(index))
      ),
    };
  };
  const atRowLimit = () => ({
    type: 'vega',
    mode: 'vega-lite',
    description: `${MAX_DATA_ROWS} rows.`,
    data: {
      columns: [
        { id: 'x', label: 'x', type: 'number', role: 'dimension' },
        { id: 'y', label: 'y', type: 'number', role: 'metric' },
      ],
      rows: Array.from({ length: MAX_DATA_ROWS }, (_, i) => [i, point(i).y]),
    },
    spec: { ...xy('line', []), data: { name: 'table' } },
  });

  const examples = () =>
    vegaExamples.flatMap(({ node }) =>
      ['light', 'dark'].map((theme) => ({ node, theme, scale: 1 }))
    );
  const atScale2 = (count) =>
    Array.from({ length: count }, (_, index) => ({
      node: vegaExamples[index % vegaExamples.length].node,
      theme: 'light',
      scale: 2,
    }));

  const jobs = {
    examples,
    one: () => atScale2(1),
    'budget-marks': () => [{ node: atMarkLimit(), theme: 'light', scale: 2 }],
    'budget-spec': () => [
      { node: atSpecLimit('line'), theme: 'light', scale: 2 },
    ],
    'budget-data': () => [{ node: atRowLimit(), theme: 'light', scale: 2 }],
    'over-marks': () => [
      { node: atSpecLimit('point'), theme: 'light', scale: 2 },
    ],
    'burst-limited': () => atScale2(16),
  }[scenario]();

  await takumi.svg({ html: '<div></div>', css: '', width: 1, height: 1 });
  global.gc();
  const loadedRss = process.memoryUsage().rss;

  const draws = [];
  const rasters = [];
  let firstChart;
  const render = async ({ node, theme, scale }) => {
    const drawStart = process.hrtime.bigint();
    const validation = runtime.validate({ type: 'view', body: [node] });
    if (!validation.valid) {
      throw new Error(
        `${scenario}: invalid: ${JSON.stringify(validation.errors.slice(0, 3))}`
      );
    }
    const input = runtime.surfaces.snapshot.render(validation.composition, {
      frame: 'charts',
      theme,
    });
    draws.push(ms(drawStart));
    const rasterStart = process.hrtime.bigint();
    await takumi.png(await takumi.fit(input), { scale });
    rasters.push(ms(rasterStart));
    firstChart ??= ms(started);
  };

  if (scenario === 'burst-limited') {
    const limited = limit(2);
    await Promise.all(jobs.map((job) => limited(() => render(job))));
  } else {
    for (const job of jobs) {
      await render(job);
    }
  }

  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  process.stdout.write(
    JSON.stringify({
      scenario,
      charts: jobs.length,
      coldStartMs: firstChart,
      drawMedianMs: median(draws),
      rasterMedianMs: median(rasters),
      totalMs: ms(started),
      loadedRssMb: mb(loadedRss),
      peakRssMb,
      renderRssMb: peakRssMb - mb(loadedRss),
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
  const runs = Number(option('--runs', check ? 3 : 4));
  const scenarios = option(
    '--scenarios',
    Object.keys(SCENARIOS).join(',')
  ).split(',');
  for (const scenario of scenarios) {
    if (!(scenario in SCENARIOS)) {
      throw new Error(`unknown scenario ${scenario}`);
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
      ['Peak RSS (MB)', 'peakRssMb', 0],
      ['RSS loaded, fonts registered (MB)', 'loadedRssMb', 0],
      ['Peak RSS less loaded (MB)', 'renderRssMb', 0],
      ['Cold start to first PNG (ms)', 'coldStartMs', 0],
      ['Validate and draw per chart, median (ms)', 'drawMedianMs', 1],
      ['takumi PNG per chart, median (ms)', 'rasterMedianMs', 1],
      ['Total (ms)', 'totalMs', 0],
    ];
    process.stdout.write(
      [
        `${runs} runs per scenario, Node ${process.version}, ${process.platform} ${process.arch}`,
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
    const report = json ? process.stderr : process.stdout;
    const failures = [];
    for (const scenario of scenarios) {
      for (const [key, bound] of Object.entries(BOUNDS[scenario] ?? {})) {
        const value = median(of(scenario, key));
        const line = `${scenario} ${key}: median ${value.toFixed(0)} MB, bound ${bound} MB`;
        report.write(`${value <= bound ? '✓' : '✗'} ${line}\n`);
        if (value > bound) {
          failures.push(line);
        }
      }
    }
    if (failures.length > 0) {
      process.stderr.write(`Over the memory budget:\n${failures.join('\n')}\n`);
      process.exitCode = 1;
    }
  }
};

module.exports = { BOUNDS };

if (require.main === module) {
  if (process.argv[2] === '--child') {
    child(process.argv[3]).catch((error) => {
      process.stderr.write(`${error.stack}\n`);
      process.exit(1);
    });
  } else {
    parent();
  }
}
