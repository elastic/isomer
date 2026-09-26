/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This pack as a value, and the slide frame a svg render of it is drawn into.
// The frame draws nothing: a slide spec is a single `slideFrame`, and that
// primitive already owns the fixed 16:9 presentation frame, so the body is
// dispatched edge-to-edge. What is left is geometry and the one-slide-per-spec rule.

import {
  definePrimitivePack,
  type Frame,
  type PrimitivePackInput,
  themeBound,
  type ThemePair,
} from '@elastic/isomer-sdk';
import { createDistillateHtmlStyleAdapter } from '@elastic/isomer-sdk/html';

import { slideBuildsEnhancement } from './builds';
import { slidesPackAuthoring } from './pack_authoring';
import { slideCopyEnhancement } from './primitives/slide_command/copy';
import { slideDeckPrimitives } from './registry';
import { withEnhancements } from './render/enhancements';
import { slideDistillery } from './theme/distillery';
import { type SlideFrameTheme, slidePaletteForMode } from './theme/palette';
import { scalePx } from './theme/scale';
import { SLIDE_THEME } from './theme/theme';

/** Pixel width of {@link slideDeckFrame}. */
export const SLIDE_WIDTH = scalePx(SLIDE_THEME.frame.width);
/** Pixel height of {@link slideDeckFrame}. */
export const SLIDE_HEIGHT = scalePx(SLIDE_THEME.frame.height);

const SLIDE_FRAME_TYPE = 'slideFrame';

/** The palette {@link slideDeckFrame} draws its surround with, per mode. */
export const slideThemes: ThemePair<SlideFrameTheme> = {
  light: { text: slidePaletteForMode('light').text },
  dark: { text: slidePaletteForMode('dark').text },
};

/** Fixed 16:9 canvas: exactly one `slideFrame` per composition. Register as `frame.slide`. */
export const slideDeckFrame: Frame<SlideFrameTheme> = {
  defaultWidth: SLIDE_WIDTH,
  // A slide is a fixed frame; node heights never enter the calculation.
  sizesFromNodeHeights: false,
  theme: slideThemes,
  estimateHeight: () => SLIDE_HEIGHT,
  validateBody: (body) => {
    const [slide, ...rest] = body;
    if (!slide || rest.length > 0) {
      return [
        `a slide's body is exactly one "${SLIDE_FRAME_TYPE}", got ${body.length} nodes; put everything on the slide inside one frame`,
      ];
    }
    if (slide.type !== SLIDE_FRAME_TYPE) {
      return [
        `a slide's body is one "${SLIDE_FRAME_TYPE}", got "${slide.type}"; wrap the slide's content in a frame`,
      ];
    }
    return [];
  },
  // `slideFrame` owns the 16:9 geometry, so this returns that one body node
  // as the image's root. Spread to add letterbox or watermark.
  wrap: (_header, body, _viewport) => body[0],
};

const styleAdapter = withEnhancements(
  createDistillateHtmlStyleAdapter(slideDistillery)
);

const packInput = {
  id: 'slides',
  primitives: slideDeckPrimitives,
  styleAdapter,
  enhancements: [slideCopyEnhancement, slideBuildsEnhancement],
  theme: themeBound<SlideFrameTheme>(),
  authoring: slidesPackAuthoring,
} satisfies PrimitivePackInput<SlideFrameTheme>;

/** This pack, ready to pass to `createIsomerRuntime`. */
export const slidesPack = definePrimitivePack(packInput);
