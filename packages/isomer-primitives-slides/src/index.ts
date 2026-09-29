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

export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type { SlideCodeNode, SlideCodePanel } from './primitives/slide_code';
export { SlideFrameView } from './primitives/slide_frame';
export type { SlideFrameNode } from './primitives/slide_frame';
export type {
  SlideGraphNode,
  SlideGraphPlacement,
  SlideGraphTerm,
} from './primitives/slide_graph';
export type { SlideHeadingNode } from './primitives/slide_heading';
export type {
  SlideRoadmapColumn,
  SlideRoadmapItem,
  SlideRoadmapNode,
} from './primitives/slide_roadmap';
export type { SlideSplitNode, SlideSplitPane } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type {
  SlideTerritory,
  SlideTerritoryGroupNode,
} from './primitives/slide_territory_group';
export type {
  SlideTimelineItem,
  SlideTimelineNode,
} from './primitives/slide_timeline';
export type {
  SlideTitleDefinition,
  SlideTitleNode,
} from './primitives/slide_title';
export type { SlideTreeEntry, SlideTreeNode } from './primitives/slide_tree';

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
  slideSizes,
  slideSplitDividers,
  slideSplitRatios,
  slideStackSpacings,
  slideTones,
} from './theme';
export type {
  SlideBulletMarker,
  SlideFrameTone,
  SlideSize,
  SlideSplitDivider,
  SlideSplitRatio,
  SlideStackSpacing,
  SlideTone,
} from './theme';
