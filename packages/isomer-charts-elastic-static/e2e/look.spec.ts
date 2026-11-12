/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The look check for this engine: the browser engine's drawing of each Scene
// against this engine's static drawing of it, in Chromium.

import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineLookSuite } from '@elastic/isomer-charts-elastic/testing';
import { chartsStylesheet } from '@elastic/isomer-primitives-charts';
import type { ColorScheme } from '@elastic/isomer-primitives-charts/scene';
import { drawExamples } from '@elastic/isomer-primitives-charts/testing';
import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import { createElasticChartsStaticRenderer } from '../src/skia';

const { drawn } = drawExamples([createElasticChartsStaticRenderer()]);

// `LOOK_SCORES=<file>` records every score as a line of JSON, to compare engines by.
const scores = process.env.LOOK_SCORES;

defineLookSuite({
  test,
  expect,
  drawn,
  ...(scores && {
    onScore: (score) => appendFileSync(scores, `${JSON.stringify(score)}\n`),
  }),
  script: async () => {
    const { outputFiles } = await build({
      stdin: {
        contents:
          "import { installLookPage } from '@elastic/isomer-charts-elastic/testing'; installLookPage();",
        resolveDir: join(__dirname, '..'),
        loader: 'ts',
      },
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'error',
    });
    return outputFiles[0]!.text;
  },
  // Elastic Charts' stylesheet for the scheme, and the charts pack's, which
  // sizes this engine's box and colors what the browser engine draws itself.
  stylesheet: (scheme: ColorScheme) =>
    `${readFileSync(
      require.resolve(`@elastic/charts/dist/theme_${scheme}.css`),
      'utf8'
    )}\n${chartsStylesheet()}`,
  // Both draw from `sceneSpecs`; what remains is the engines' text layout and
  // the gaps the docs list.
  sameScene: { xy: 0.75, metric: 0.7, partition: 0.75 },
  // Where a metric title wraps, the engines break it at different words and
  // fit the value to what is left.
  looser: { 'metric: Long title and subtitle': 0.5 },
  unlike: {
    metric: [
      ['metric: Single value', 'metric: Compared to the primary value'],
      [
        'metric: Single value',
        'metric: Breakdown with Other and missing buckets',
      ],
      ['metric: Single value', 'metric: Trend line'],
      ['metric: Single value', 'metric: Multivalue and date secondary'],
      [
        'metric: Long title and subtitle',
        'metric: Breakdown with Other and missing buckets',
      ],
    ],
    xy: [
      ['xyChart: Time series line', 'xyChart: Horizontal bars'],
      ['xyChart: Time series line', 'xyChart: Two y axes'],
      [
        'xyChart: Stacked bars with Other and missing buckets',
        'xyChart: Percentage areas',
      ],
      [
        'xyChart: Reference lines and annotations',
        'xyChart: Authored with palette colors',
      ],
      [
        'xyChart: Long labels and legend statistics',
        'xyChart: Stacked bars with Other and missing buckets',
      ],
    ],
    partition: [
      [
        'partitionChart: Pie',
        'partitionChart: Donut with Other and missing buckets',
      ],
      ['partitionChart: Pie', 'partitionChart: Treemap'],
      ['partitionChart: Nested pie with values', 'partitionChart: Mosaic'],
      ['partitionChart: Waffle by day', 'partitionChart: Treemap'],
      [
        'partitionChart: Several metrics',
        'partitionChart: Donut with Other and missing buckets',
      ],
    ],
  },
});
