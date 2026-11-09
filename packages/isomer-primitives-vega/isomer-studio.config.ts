/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Vega pack on every surface, in light and dark, on the charts pack's
// page for snapshots and PNGs, as a render service draws it.
//
//   pnpm --filter @elastic/isomer-primitives-vega studio

import { chartsFrame } from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { vegaPack, vegaStylesheet } from './src/index';

export default defineStudioConfig({
  title: 'Isomer Vega pack',
  runtime: createIsomerRuntime({
    packs: [vegaPack],
    frames: { charts: chartsFrame },
    defaultFrame: 'charts',
  }),
  stylesheet: vegaStylesheet,
  imageFonts: './studio/image_fonts.ts',
});
