/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsPack } from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';
import { previewSlide } from './packages/isomer-primitives-slides/src/examples/preview_slide';
import {
  slideDeckFrame,
  slidesPack,
} from './packages/isomer-primitives-slides/src/index';

/** The repository's Studio: every in-repo pack, drawn in the browser alone. */
export default defineStudioConfig({
  ...slidesStudioConfig,
  runtime: createIsomerRuntime({
    packs: [slidesPack, chartsPack],
    frames: { slide: slideDeckFrame },
  }),
  // Slides preview inside a slide; charts preview on their own.
  previewExample: (node) =>
    chartsPack.types.has(node.type)
      ? { type: 'view', body: [node] }
      : previewSlide(node),
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
