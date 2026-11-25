/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What takumi costs on its own, drawing input the slides pack's `snapshot`
// surface made in the parent: a child loads only takumi and its fonts.

const {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} = require('node:fs');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '../..');
const SLIDES = resolve(PACKAGE, '../isomer-primitives-slides');
const DECK = 'isomer-every-surface';
const CACHE = join(PACKAGE, 'node_modules/.cache/isomer-benchmarks/takumi');
const REPEAT = 20;
const FONTSOURCE = {
  Inter: ['@fontsource/inter', 'inter'],
  'Roboto Mono': ['@fontsource/roboto-mono', 'roboto-mono'],
};

/** Each row's work; rows meant to be subtracted share everything before their stage. */
const ROWS = [
  {
    name: 'backend',
    about:
      'load takumi, create a backend and draw an empty 1×1 SVG, with no font registered',
    spec: { work: 'none', register: false },
  },
  {
    name: 'fonts',
    about:
      "the same, with the slides theme's 10 font faces registered by that first draw",
    spec: { work: 'none' },
  },
  {
    name: 'png-first',
    about: 'one slide to PNG at 1×, cold',
    spec: { work: 'png', slides: 1 },
  },
  {
    name: 'png-deck',
    about: 'every slide to PNG at 1×, one at a time',
    spec: { work: 'png' },
  },
  {
    name: 'png-deck-2x',
    about: 'every slide to PNG at 2×, one at a time',
    spec: { work: 'png', scale: 2 },
  },
  {
    name: 'png-repeat',
    about: `every slide to PNG at 1×, ${REPEAT} times over, with the default 64 MiB cache`,
    spec: { work: 'png', repeat: REPEAT },
  },
  {
    name: 'png-repeat-nocache',
    about: `every slide to PNG at 1×, ${REPEAT} times over, with \`cacheMaxBytes: 0\``,
    spec: { work: 'png', repeat: REPEAT, cacheMaxBytes: 0 },
  },
  {
    name: 'png-burst-4',
    about: 'every slide to PNG at 1×, requested at once through a limiter of 4',
    spec: { work: 'png', inFlight: 4 },
  },
  {
    name: 'png-burst',
    about: 'every slide to PNG at 1×, requested at once, no limiter',
    spec: { work: 'png', inFlight: 'all' },
  },
  {
    name: 'svg-deck',
    about: 'every slide to SVG, one at a time',
    spec: { work: 'svg' },
  },
  {
    name: 'pdf-deck',
    about:
      'the whole deck to one PDF, cold: the worker starts and registers the fonts',
    spec: { work: 'pdf' },
  },
  {
    name: 'pdf-repeat',
    about: `the whole deck to PDF ${REPEAT} times over`,
    spec: { work: 'pdf', repeat: REPEAT },
  },
  {
    name: 'pdf-close',
    about: 'the whole deck to PDF, then `close()` the worker',
    spec: { work: 'pdf', close: true },
  },
  {
    name: 'pdf-page',
    about: "the deck's first slide to a one-page PDF, cold",
    spec: { work: 'pdf', slides: 1 },
  },
];

/** The deck's `snapshot` input, one file per shape a row draws, and the fonts its theme names; made in the parent. */
const prepare = async (picked) => {
  const { createHash } = require('node:crypto');
  const requireFrom = createRequire(join(SLIDES, 'noop.js'));
  const { createIsomerRuntime } = requireFrom('@elastic/isomer-runtime');
  const { slideDeckFrame, slideFontFaces, slidesPack } = requireFrom(
    '@elastic/isomer-primitives-slides'
  );
  const { slides } = JSON.parse(
    readFileSync(join(SLIDES, 'decks', `${DECK}.json`), 'utf8')
  );
  const runtime = createIsomerRuntime({
    packs: [slidesPack],
    frames: { slide: slideDeckFrame },
  });
  const { snapshot } = runtime.surfaces;
  const fonts = slideFontFaces.map(({ family, weight, style }) => {
    const [pkg, slug] = FONTSOURCE[family] ?? [];
    if (pkg === undefined) {
      throw new Error(`no font files for ${family}`);
    }
    return {
      name: family,
      weight,
      style,
      file: require.resolve(
        `${pkg}/files/${slug}-latin-${weight}-${style}.woff2`,
        { paths: [PACKAGE] }
      ),
    };
  });
  const collect = { onValidationError: 'collect' };
  const image = (slide) => {
    const { html, css, width, height, heightMode } = snapshot.render(
      slide,
      collect
    );
    return { html, css, width, height, heightMode };
  };
  const paged = (list) => {
    const { pages, css, width, height, heightMode } = snapshot.renderPages(
      list,
      collect
    );
    return {
      pages: pages.map(({ html }) => ({ html })),
      css,
      width,
      height,
      heightMode,
    };
  };
  // Named for its content and moved into place whole, so a concurrent run never reads it half written.
  const write = (name, value) => {
    const content = JSON.stringify(value);
    const file = join(
      CACHE,
      `${DECK}-${name}-${createHash('sha256').update(content).digest('hex').slice(0, 16)}.json`
    );
    if (!existsSync(file)) {
      mkdirSync(CACHE, { recursive: true });
      const partial = `${file}.${process.pid}.tmp`;
      writeFileSync(partial, content);
      renameSync(partial, file);
    }
    return file;
  };
  const inputs = {};
  const inputFor = ({ work, slides: count }) => {
    if (work === 'none') {
      return undefined;
    }
    const shape = `${work === 'pdf' ? 'pages' : 'images'}-${count === 1 ? 'first' : 'all'}`;
    inputs[shape] ??= write(
      shape,
      work === 'pdf'
        ? paged(slides.slice(0, count))
        : slides.slice(0, count).map(image)
    );
    return inputs[shape];
  };
  return picked.map((scenario) => ({
    ...scenario,
    spec: { ...scenario.spec, input: inputFor(scenario.spec), fonts },
  }));
};

const scenarios = async () =>
  ROWS.map(({ name, about, spec }) => ({ name, about, spec }));

const mb = (bytes) => bytes / 1024 / 1024;
const ms = (from) => Number(process.hrtime.bigint() - from) / 1e6;
const median = (list) =>
  list.length === 0
    ? undefined
    : [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const settledRss = () => {
  global.gc();
  return process.memoryUsage().rss;
};

const run = async ({
  input,
  work,
  fonts: faces,
  register = true,
  scale = 1,
  repeat = 1,
  cacheMaxBytes,
  inFlight,
  close = false,
}) => {
  const started = process.hrtime.bigint();
  const { createTakumiImageBackend } = require(
    require.resolve('@elastic/isomer-image-takumi', { paths: [PACKAGE] })
  );
  // Its own file, since the package's main entry would load the SDK too.
  const { timeDraws } = require(join(PACKAGE, 'lib/cjs/time_draws.js'));
  const fonts = register
    ? faces.map(({ file, ...face }) => ({
        ...face,
        data: () => readFileSync(file),
      }))
    : [];
  const takumi = createTakumiImageBackend({
    fonts,
    ...(cacheMaxBytes === undefined ? {} : { cacheMaxBytes }),
  });
  // Read before the sample, so `Loaded RSS` holds the row's own input, as a host holds a request's.
  const data =
    input === undefined ? null : JSON.parse(readFileSync(input, 'utf8'));
  const loadedRss = settledRss();

  const bytes = (text) => Buffer.byteLength(text, 'utf8');
  const inputKb =
    data === null
      ? undefined
      : (work === 'pdf'
          ? bytes(data.css) +
            data.pages.reduce((n, { html }) => n + bytes(html), 0)
          : data.reduce(
              (n, { html, css }) => n + bytes(html) + bytes(css),
              0
            )) / 1024;
  const draws = {
    png: () => data.map((slide) => () => takumi.png(slide, { scale })),
    svg: () => data.map((slide) => () => takumi.svg(slide)),
    pdf: () => [
      () => takumi.pdf(data, { metadata: { creationDate: '2026-01-01' } }),
    ],
  };

  const times = [];
  let outKb = 0;
  let outputs = 0;
  let firstMs;
  let allMs = 0;
  let afterFirstPass;
  if (work === 'none') {
    // An empty render registers any fonts and draws nothing.
    await takumi.svg({ html: '<div></div>', css: '', width: 1, height: 1 });
    firstMs = ms(started);
  } else {
    for (let pass = 0; pass < repeat; pass += 1) {
      const passStart = process.hrtime.bigint();
      const results = await timeDraws(
        // Each output is reduced to its size at once, so no pass holds its outputs.
        draws[work]().map((draw) => async () => {
          const out = await draw();
          firstMs ??= ms(started);
          return (typeof out === 'string' ? bytes(out) : out.length) / 1024;
        }),
        { inFlight }
      );
      allMs += ms(passStart);
      for (const { value: kb, ms: each } of results) {
        times.push(each);
        outputs += 1;
        outKb = Math.max(outKb, kb);
      }
      if (pass === 0 && repeat > 1) {
        afterFirstPass = settledRss();
      }
    }
  }
  // `maxRSS` is in kilobytes. Sampled before closing and the settling below.
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  if (close) {
    await takumi.close();
  }
  const rssAfter = settledRss();
  if (!close) {
    await takumi.close();
  }
  return {
    peakRssMb,
    outputs,
    ...(work === 'pdf' ? { pages: data.pages.length } : {}),
    ...(inputKb === undefined ? {} : { inputKb }),
    loadedRssMb: mb(loadedRss),
    renderRssMb: peakRssMb - mb(loadedRss),
    rssAfterMb: mb(rssAfter),
    ...(repeat > 1 ? { growthMb: mb(rssAfter - afterFirstPass) } : {}),
    heapAfterMb: mb(process.memoryUsage().heapUsed),
    firstMs,
    ...(times.length === 0 ? {} : { eachMs: median(times), allMs }),
    ...(outputs === 0 ? {} : { outKb }),
  };
};

module.exports = {
  title: 'Rasterizing with takumi',
  about: `What takumi costs a fresh Node process on its own, drawing the slides pack's \`${DECK}\` deck: the parent renders the deck with the \`snapshot\` surface once, and each child loads only takumi, registers the theme's font faces and draws that input. \`Loaded RSS\` is after creating the backend and reading the row's input, before any font registers; \`Render RSS\` is the peak above it, and \`RSS after\` is after the run, a GC and, for \`pdf-close\`, \`close()\`. \`Growth\` is how much \`RSS after\` rose past the first pass of a repeated row. Native memory and the PDF worker's show only in RSS; \`Heap after\` is the main thread's alone. Per-output time is the median, from the request to its output; under a burst it includes the wait in the limiter or for one of the libuv thread pool's threads, and \`UV_THREADPOOL_SIZE\` is in the environment. \`All outputs\` excludes the GC between passes. Both no-output rows draw one empty SVG, so their difference is the fonts' registration. Report only: nothing here is bounded yet.`,
  measures: [
    { key: 'outputs', label: 'Outputs', digits: 0 },
    { key: 'pages', label: 'PDF pages', digits: 0 },
    { key: 'inputKb', label: 'Input (KB)', digits: 0 },
    { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
    { key: 'loadedRssMb', label: 'Loaded RSS (MB)', digits: 0 },
    { key: 'renderRssMb', label: 'Render RSS (MB)', digits: 0 },
    { key: 'rssAfterMb', label: 'RSS after (MB)', digits: 0 },
    { key: 'growthMb', label: 'Growth (MB)', digits: 1 },
    { key: 'heapAfterMb', label: 'Heap after (MB)', digits: 1 },
    { key: 'firstMs', label: 'First output (ms)', digits: 0 },
    { key: 'eachMs', label: 'Each output (ms)', digits: 1 },
    { key: 'allMs', label: 'All outputs (ms)', digits: 0 },
    { key: 'outKb', label: 'Largest output (KB)', digits: 0 },
  ],
  scenarios,
  prepare,
  run,
};
