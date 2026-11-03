/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { elasticChartsPack, elasticChartsReset } from './src/index';
import { lensChartApp } from './studio/lens/registration';
import { elasticChartsStylesheet } from './studio/stylesheet';

/** The charts pack's Studio, drawn with Elastic Charts. */
export default defineStudioConfig({
  title: 'Isomer Charts',
  runtime: createIsomerRuntime({ packs: [elasticChartsPack] }),
  stylesheet: () => `${elasticChartsReset}${elasticChartsStylesheet}`,
  // Actions surface in the browser console.
  createReactContext: () => ({
    onEvent: (event) => console.info('isomer action', JSON.stringify(event)),
  }),
  featured: ['metric'],
  apps: [lensChartApp],
  images: false,
});
