/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { slideDistillery, toneBgVar, toneVar } from './distillery';
export { slideModules, slideStylesheet } from './modules';
export { slidePaletteForMode } from './palette';
export type { SlideFrameTheme, SlidePalette } from './palette';
export { literal, paddingXy, px, scalePx } from './scale';
export {
  slideBulletMarkers,
  slideCardColumnCounts,
  slideCardColumns,
  slideCardColumnsKey,
  slideCardGroupStyles,
  slideFrameLayouts,
  slideSplitRatios,
  slideStackSpacings,
  slideTitleSizes,
  slideTones,
} from './variants';
export type {
  SlideBulletMarker,
  SlideCardColumnCount,
  SlideCardColumns,
  SlideCardGroupStyle,
  SlideFrameLayout,
  SlideSplitRatio,
  SlideStackSpacing,
  SlideTitleSize,
  SlideTone,
} from './variants';
