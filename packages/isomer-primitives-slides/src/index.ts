/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  buildSlidesAuthoringPrompt,
  slidesAuthoringGuide,
  slidesAuthoringRules,
} from './agent_guide';

export type { SlideContentNode } from './body_node';

export { slideJsx } from './jsx';

export {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  slideDeckFrame,
  slidesPack,
  slideThemes,
} from './pack';
export { slidePrimitiveGroups } from './pack_authoring';

export type { SlideBarsItem, SlideBarsNode } from './primitives/slide_bars';
export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type { SlideCodeNode, SlideCodePanel } from './primitives/slide_code';
export type { SlideDeltaNode, SlideDeltaPoint } from './primitives/slide_delta';
export { SlideFrameView } from './primitives/slide_frame';
export type { SlideFrameNode } from './primitives/slide_frame';
export type { SlideHeadingNode } from './primitives/slide_heading';
export type {
  SlideMatrixNode,
  SlideMatrixRow,
} from './primitives/slide_matrix';
export type {
  SlideQuadrant,
  SlideQuadrantNode,
} from './primitives/slide_quadrant';
export type { SlideSplitNode, SlideSplitPane } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type { SlideStatNode } from './primitives/slide_stat';
export type { SlideStatsItem, SlideStatsNode } from './primitives/slide_stats';
export type { SlideTableGroup, SlideTableNode } from './primitives/slide_table';
export type {
  SlideTerritory,
  SlideTerritoryGroupNode,
} from './primitives/slide_territory_group';
export type {
  SlideTitleDefinition,
  SlideTitleNode,
} from './primitives/slide_title';

export { slideDeckPrimitives, slidePrimitiveTypes } from './registry';

export type {
  SlidePackTypes,
  SlideRenderContext,
  SlideRenderScope,
} from './render';

export { StandaloneSlideNode } from './standalone';

export { slideStylesheet } from './stylesheet';

export { slideFontFaces, slidePaletteForMode } from './theme';
export type { SlideFontFace, SlideFrameTheme, SlidePalette } from './theme';
export {
  slideBulletMarkers,
  slideFrameTones,
  slideMatrixMarks,
  slideSizes,
  slideSplitDividers,
  slideSplitRatios,
  slideStackSpacings,
  slideTones,
} from './theme';
export type {
  SlideBulletMarker,
  SlideFrameTone,
  SlideMatrixMark,
  SlideSize,
  SlideSplitDivider,
  SlideSplitRatio,
  SlideStackSpacing,
  SlideTone,
} from './theme';
