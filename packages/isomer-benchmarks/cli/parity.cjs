/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What `compare` checks a chart engine drew the same with either build: every
// example of every primitive in the charts pack, light and dark, through the
// `snapshot` surface and to PNG at 1×, each hashed, markup and PNG apart.

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '..');

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

const run = async ({ base, engine }) => {
  const requireFrom = createRequire(join(base, 'noop.js'));
  const { createIsomerRuntime } = requireFrom('@elastic/isomer-runtime');
  const { primitiveExamples } = requireFrom('@elastic/isomer-sdk');
  const { chartsFrame, createChartsPack } = requireFrom(
    '@elastic/isomer-primitives-charts'
  );
  const { createRenderers, stylesheet } = require(engine);
  const takumi = requireFrom(
    '@elastic/isomer-image-takumi'
  ).createTakumiImageBackend({
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
  });
  // A chart the engine fails on would draw the same failure note on both sides.
  const pack = createChartsPack({
    sceneRenderers: createRenderers(),
    onFailure: (error) => {
      throw error;
    },
  });
  const runtime = createIsomerRuntime({
    packs: [pack],
    frames: { charts: chartsFrame },
    formats: takumi.formats,
  });

  const drawn = {};
  for (const definition of pack.primitives) {
    for (const [index, { node }] of primitiveExamples(definition).entries()) {
      for (const theme of ['light', 'dark']) {
        const validation = runtime.validate({ type: 'view', body: [node] });
        if (!validation.valid) {
          continue;
        }
        const input = runtime.surfaces.snapshot.render(validation.composition, {
          theme,
          onValidationError: 'collect',
        });
        const css = stylesheet
          ? `${stylesheet(theme)}\n${input.css}`
          : input.css;
        const png = await takumi.png(await takumi.fit({ ...input, css }), {
          scale: 1,
        });
        drawn[`${definition.type}#${index} ${theme}`] = {
          markup: hash(`${input.html}\n${css}`),
          png: hash(Buffer.from(png)),
        };
      }
    }
  }
  return { drawn };
};

module.exports = { run };
