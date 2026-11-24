/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Node renderer's markup, laid out by Chromium, against the browser
// renderer's drawing of the same Scene.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { chartsStylesheet } from '@elastic/isomer-primitives-charts';
import { drawExamples } from '@elastic/isomer-primitives-charts/testing';
import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

import {
  createElasticChartsNodeRenderer,
  ELASTIC_CHARTS_HOST_RULES,
} from '../src/node';
import { elasticChartsStylesheet } from '../src/shared/styles';
import { defineLookSuite } from '../src/testing';

const require = createRequire(__filename);
const WEIGHTS = [400, 500, 600, 700];

// `renderChart` measures text as Inter, so the page draws both pictures in it.
const FONT_FACES = WEIGHTS.map(
  (weight) =>
    `@font-face{font-family:Inter;font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(
      require.resolve(
        `@fontsource/inter/files/inter-latin-${weight}-normal.woff2`
      )
    ).toString('base64')}) format('woff2')}`
).join('\n');

/** The look page, holding each drawing until Inter has loaded. */
const script = async (): Promise<string> => {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import { installLookPage } from './look_page';
        installLookPage();
        const { drawScene } = window;
        const fonts = Promise.all(${JSON.stringify(WEIGHTS)}.map((weight) => document.fonts.load(weight + ' 12px Inter')));
        window.drawScene = async (scene) => { await fonts; return drawScene(scene); };
      `,
      resolveDir: `${__dirname}/../src/testing`,
      loader: 'ts',
    },
    bundle: true,
    format: 'iife',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
  });
  return outputFiles[0]!.text;
};

const { drawn } = drawExamples([createElasticChartsNodeRenderer()]);

defineLookSuite({
  test,
  expect,
  drawn,
  script,
  stylesheet: (scheme) =>
    [
      FONT_FACES,
      readFileSync(
        require.resolve(`@elastic/charts/theme_only_${scheme}.css`),
        'utf8'
      ),
      ELASTIC_CHARTS_HOST_RULES,
      elasticChartsStylesheet(),
      chartsStylesheet(),
    ].join('\n'),
  // Measured on `@elastic/charts` 73.5.1: the lowest same-Scene score is 1.000
  // for a metric, 0.995 for a gauge, 0.986 for a partition, 0.977 for an xy
  // chart and 0.992 for a heat map but the one below; the highest of the
  // `unlike` pairs is 0.834.
  sameScene: {
    metric: 0.95,
    gauge: 0.95,
    partition: 0.93,
    xy: 0.93,
    heatmap: 0.95,
  },
  looser: {
    // `renderChart` measures `%` narrower than Chromium draws it, so this
    // legend's percentage bands are cut in the browser and fit on Node: 0.889.
    'heatmap: Selectable, brushable, pre-rendered and with provenance': 0.85,
  },
  unlike: {
    metric: [
      ['metric: Single value', 'metric: Trend line'],
      [
        'metric: Compared to the primary value',
        'metric: Multivalue and date secondary',
      ],
    ],
    gauge: [
      ['gauge: Semicircle with bands and a goal', 'gauge: Huge value'],
      ['gauge: Horizontal bullet', 'gauge: Negative value'],
    ],
    partition: [
      ['partitionChart: Pie', 'partitionChart: Treemap'],
      [
        'partitionChart: Pie',
        'partitionChart: Selectable, pre-rendered and with provenance',
      ],
    ],
    xy: [
      [
        'xyChart: Time series line',
        'xyChart: Stacked bars with Other and missing buckets',
      ],
      [
        'xyChart: Stacked bars with Other and missing buckets',
        'xyChart: Interactive stacked bars',
      ],
    ],
    heatmap: [
      ['heatmap: Hourly by host', 'heatmap: One row, no y'],
      [
        'heatmap: Every value the same',
        'heatmap: Huge, tiny and missing values',
      ],
    ],
  },
});
