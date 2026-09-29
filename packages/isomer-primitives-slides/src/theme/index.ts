/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { slideDistillery, themeVarName, toneVar } from './distillery';
export { slideFontFaces } from './fonts';
export type { SlideFontFace } from './fonts';
export { slidePaletteForMode } from './palette';
export type { SlideFrameTheme, SlidePalette } from './palette';
export { literal, paddingXy, px, scalePx } from './scale';
export {
  slideBulletMarkers,
  slideFrameTones,
  slideSizes,
  slideSplitDividers,
  slideSplitRatios,
  slideStackSpacings,
  slideTones,
} from './variants';
export type {
  SlideBulletMarker,
  SlideFrameTone,
  SlideSize,
  SlideSplitDivider,
  SlideSplitRatio,
  SlideStackSpacing,
  SlideTone,
} from './variants';
