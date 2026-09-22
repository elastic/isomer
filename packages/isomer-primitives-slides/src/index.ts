/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { SlideContentNode } from './body_node';

export {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  slideDeckFrame,
  slidesPack,
  slideThemes,
} from './pack';

export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type {
  SlideCard,
  SlideCardGroupNode,
} from './primitives/slide_card_group';
export type { SlideCodeNode } from './primitives/slide_code';
export type { SlideFlowNode } from './primitives/slide_flow';
export { SlideFrameView } from './primitives/slide_frame';
export type { SlideFrameNode } from './primitives/slide_frame';
export type { SlideSplitNode } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type {
  SlideTerritory,
  SlideTerritoryGroupNode,
} from './primitives/slide_territory_group';
export type {
  SlideLedeLink,
  SlideLedePart,
  SlideTitleNode,
} from './primitives/slide_title';

export { slideDeckPrimitives, slidePrimitiveTypes } from './registry';

export type {
  SlidePackTypes,
  SlideRenderContext,
  SlideRenderScope,
} from './render';

export { StandaloneSlideNode } from './standalone';

export { slidePaletteForMode, slideStylesheet } from './theme';
export type { SlideFrameTheme, SlidePalette } from './theme';
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
} from './theme';
export type { SlideTone } from './theme';
