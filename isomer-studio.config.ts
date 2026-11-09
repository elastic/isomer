/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createElasticChartsHeadlessRenderer,
  elasticChartsStylesheet,
} from '@elastic/isomer-charts-elastic/headless';
import {
  chartsFrame,
  type ChartsFrameTheme,
  chartsStylesheet,
  createChartsPack,
} from '@elastic/isomer-primitives-charts';
import { vegaPack, vegaStylesheet } from '@elastic/isomer-primitives-vega';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Frame } from '@elastic/isomer-sdk';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';
import { previewSlide } from './packages/isomer-primitives-slides/src/examples/preview_slide';
import {
  slideDeckFrame,
  type SlideFrameTheme,
  slidesPack,
  slideStylesheet,
} from './packages/isomer-primitives-slides/src/index';

// One runtime's frames share a theme: the slide deck's carries the charts keys too.
const slideFrame: Frame<SlideFrameTheme & ChartsFrameTheme> = {
  ...slideDeckFrame,
  theme: {
    light: { ...chartsFrame.theme.light, ...slideDeckFrame.theme.light },
    dark: { ...chartsFrame.theme.dark, ...slideDeckFrame.theme.dark },
  },
};

// The Studio's previews are static markup, in the browser and on its server,
// so charts draw with headless Elastic Charts in both.
// In the browser, text is measured as the browser will draw it.
const measureTextWidth =
  typeof document === 'undefined'
    ? undefined
    : (() => {
        const context = document.createElement('canvas').getContext('2d');
        return context
          ? (text: string, font: string) => {
              context.font = font;
              return context.measureText(text).width;
            }
          : undefined;
      })();

const chartsPack = createChartsPack({
  sceneRenderers: [
    createElasticChartsHeadlessRenderer({
      environments: ['node', 'browser'],
      ...(measureTextWidth && { measureTextWidth }),
    }),
  ],
});

/** Charts and Vega charts preview on the charts page. */
const isChart = (type: string) =>
  chartsPack.types.has(type) || vegaPack.types.has(type);

/** The repository's Studio: every in-repo pack, drawn in the browser alone. */
export default defineStudioConfig({
  ...slidesStudioConfig,
  runtime: createIsomerRuntime({
    packs: [slidesPack, chartsPack, vegaPack],
    frames: { slide: slideFrame, charts: chartsFrame },
    defaultFrame: 'slide',
  }),
  stylesheet: () =>
    `${slideStylesheet()}\n${chartsStylesheet()}\n${elasticChartsStylesheet()}\n${vegaStylesheet()}`,
  // Slides preview inside a slide; charts preview on their own.
  previewExample: (node) =>
    isChart(node.type) ? { type: 'view', body: [node] } : previewSlide(node),
  snapshotFrame: ({ body }) =>
    body.length && body.every(({ type }) => isChart(type))
      ? 'charts'
      : undefined,
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
