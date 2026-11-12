/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The charts pack drawn as a render service draws it: static Elastic Charts
// in the Studio's Node server, rasterized by takumi to PNG and PDF. Previews in
// the browser draw the same engine, so both show the same chart.
//
//   pnpm --filter @elastic/isomer-charts-elastic-static studio

import {
  chartsFrame,
  createChartsPack,
} from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { createElasticChartsStaticRenderer } from './src/svg';

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

export default defineStudioConfig({
  title: 'Isomer charts render service',
  runtime: createIsomerRuntime({
    packs: [
      createChartsPack({
        sceneRenderers: [
          createElasticChartsStaticRenderer({
            environments: ['node', 'browser'],
            ...(measureTextWidth && { measureTextWidth }),
          }),
        ],
      }),
    ],
    frames: { charts: chartsFrame },
  }),
  imageFonts: './studio/image_fonts.ts',
});
