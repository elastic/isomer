/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';
import { previewSlide } from './packages/isomer-primitives-slides/src/examples/preview_slide';
import {
  slideDeckFrame,
  slidesPack,
  slideStylesheet,
} from './packages/isomer-primitives-slides/src/index';
import {
  elasticChartsPack,
  elasticChartsReset,
} from './packages/isomer-renderers-elastic-charts/src/index';
import { lensChartApp } from './packages/isomer-renderers-elastic-charts/studio/lens/registration';
import { elasticChartsStylesheet } from './packages/isomer-renderers-elastic-charts/studio/stylesheet';

const chartTypes = new Set(['metric']);

/** The repository's Studio: every in-repo pack, drawn in the browser alone. */
export default defineStudioConfig({
  ...slidesStudioConfig,
  runtime: createIsomerRuntime({
    packs: [slidesPack, elasticChartsPack],
    frames: { slide: slideDeckFrame },
  }),
  stylesheet: () =>
    `${slideStylesheet()}${elasticChartsReset}${elasticChartsStylesheet}`,
  // A chart is shown on its own; every slide primitive inside a slide.
  previewExample: (node) =>
    chartTypes.has(node.type)
      ? { type: 'view', body: [node] }
      : previewSlide(node),
  featured: [...(slidesStudioConfig.featured ?? []), 'metric'],
  apps: [
    ...(slidesStudioConfig.apps ?? []),
    {
      id: 'lens',
      title: 'Lens inspector',
      description:
        'Plan a native ES|QL Lens saved object and replay a recorded response; nothing is fetched or executed.',
      load: () => import('./packages/isomer-lowering-lens/studio/app'),
    },
    lensChartApp,
  ],
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
