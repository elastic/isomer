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

export {
  type SlideBuild,
  SLIDE_BUILDS,
  showSlideBuild,
  slideBuilds,
  slideBuildsEnhancement,
} from './builds';

export { slideJsx } from './jsx';

export {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  slideDeckFrame,
  slidesPack,
  slideThemes,
} from './pack';
export { slidePrimitiveGroups } from './pack_authoring';

export type {
  SlideAnnotatedRenderNode,
  SlideAnnotatedRenderPin,
} from './primitives/slide_annotated_render';
export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type { SlideCodeNode, SlideCodePanel } from './primitives/slide_code';
export type { SlideColumn, SlideColumnsNode } from './primitives/slide_columns';
export { SlideFrameView } from './primitives/slide_frame';
export type { SlideFrameNode } from './primitives/slide_frame';
export type { SlideHeadingNode } from './primitives/slide_heading';
export type { SlideRenderNode } from './primitives/slide_render';
export type {
  SlideRenderGridNode,
  SlideRenderGridTile,
} from './primitives/slide_render_grid';
export type { SlideSplitNode, SlideSplitPane } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type {
  SlideTerritory,
  SlideTerritoryGroupNode,
} from './primitives/slide_territory_group';
export type {
  SlideTitleDefinition,
  SlideTitleNode,
} from './primitives/slide_title';
export type { SlideWindowNode } from './primitives/slide_window';

export { slideDeckPrimitives, slidePrimitiveTypes } from './registry';

export type {
  SlidePackTypes,
  SlideRenderContext,
  SlideRenderScope,
} from './render';

export {
  type NamedSlide,
  type ResolveSlideRendersOptions,
  resolveSlideRenders,
} from './resolve_renders';

export { StandaloneSlideNode } from './standalone';

export { slideStylesheet } from './stylesheet';

export { slideFontFaces, slidePaletteForMode } from './theme';
export type { SlideFontFace, SlideFrameTheme, SlidePalette } from './theme';
export {
  slideBulletMarkers,
  slideFrameTones,
  slideRenderSurfaces,
  slideSizes,
  slideSplitDividers,
  slideSplitRatios,
  slideStackSpacings,
  slideTones,
  slideWindowChromes,
} from './theme';
export type {
  SlideBulletMarker,
  SlideFrameTone,
  SlideRenderSurface,
  SlideSize,
  SlideSplitDivider,
  SlideSplitRatio,
  SlideStackSpacing,
  SlideTone,
  SlideWindowChrome,
} from './theme';
