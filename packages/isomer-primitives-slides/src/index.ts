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
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  slideDeckFrame,
  slidesPack,
  slideThemes,
} from './pack';

export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type {
  SlideClosingLink,
  SlideClosingNode,
  SlideClosingPath,
} from './primitives/slide_closing';
export type { SlideCodeNode, SlideCodePanel } from './primitives/slide_code';
export type { SlideColumn, SlideColumnsNode } from './primitives/slide_columns';
export type {
  SlideDefinition,
  SlideDefinitionsNode,
} from './primitives/slide_definitions';
export type {
  SlideFanoutNode,
  SlideFanoutTarget,
} from './primitives/slide_fanout';
export type { SlideFrameNode } from './primitives/slide_frame';
export { SlideFrameView } from './primitives/slide_frame';
export type {
  SlideGraphNode,
  SlideGraphPlacement,
  SlideGraphTerm,
} from './primitives/slide_graph';
export type { SlideHeadingNode } from './primitives/slide_heading';
export type {
  SlideLanesLane,
  SlideLanesNode,
  SlideLanesNote,
} from './primitives/slide_lanes';
export type { SlideListItem, SlideListNode } from './primitives/slide_list';
export type {
  SlidePipelineNode,
  SlidePipelineSpan,
  SlidePipelineStep,
} from './primitives/slide_pipeline';
export type { SlideRenderNode } from './primitives/slide_render';
export type {
  SlideRenderGridNode,
  SlideRenderGridTile,
} from './primitives/slide_render_grid';
export type { SlideSectionNode } from './primitives/slide_section';
export type { SlideSplitNode, SlideSplitSide } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type { SlideStatNode } from './primitives/slide_stat';
export type { SlideStatsItem, SlideStatsNode } from './primitives/slide_stats';
export type { SlideTableGroup, SlideTableNode } from './primitives/slide_table';
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
export type {
  SlideTranscriptNode,
  SlideTranscriptTurn,
} from './primitives/slide_transcript';
export type { SlideTreeEntry, SlideTreeNode } from './primitives/slide_tree';
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

export { slidePaletteForMode } from './theme';
export type { SlideFrameTheme, SlidePalette } from './theme';
export {
  slideBulletMarkers,
  slideFrameTones,
  slideRenderSurfaces,
  slideSplitDividers,
  slideSplitRatios,
  slideStackSpacings,
  slideTones,
  slideTranscriptFormats,
  slideTranscriptRoles,
  slideWindowChromes,
} from './theme';
export type {
  SlideFrameTone,
  SlideRenderSurface,
  SlideSplitDivider,
  SlideSplitRatio,
  SlideTone,
  SlideTranscriptFormat,
  SlideTranscriptRole,
  SlideWindowChrome,
} from './theme';
