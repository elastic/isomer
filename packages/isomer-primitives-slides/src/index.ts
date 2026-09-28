/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { SlideContentNode } from './body_node';

export {
  type SlideBuildParts,
  SLIDE_BUILDS,
  showSlideBuild,
  slideBuildParts,
  slideBuilds,
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
  SlideAgendaNode,
  SlideAgendaSection,
} from './primitives/slide_agenda';
export type { SlideBarsItem, SlideBarsNode } from './primitives/slide_bars';
export type { SlideBulletListNode } from './primitives/slide_bullet_list';
export type {
  SlideClosingLink,
  SlideClosingNode,
  SlideClosingPath,
} from './primitives/slide_closing';
export type { SlideCodeNode, SlideCodePanel } from './primitives/slide_code';
export type {
  SlideDefinition,
  SlideDefinitionsNode,
} from './primitives/slide_definitions';
export type { SlideDeltaNode, SlideDeltaPoint } from './primitives/slide_delta';
export type {
  SlideFanoutNode,
  SlideFanoutTarget,
} from './primitives/slide_fanout';
export type { SlideFrameNode } from './primitives/slide_frame';
export { SlideFrameView } from './primitives/slide_frame';
export type { SlideHeadingNode } from './primitives/slide_heading';
export type { SlideListItem, SlideListNode } from './primitives/slide_list';
export type {
  SlideMatrixNode,
  SlideMatrixRow,
} from './primitives/slide_matrix';
export type {
  SlideQuadrant,
  SlideQuadrantNode,
} from './primitives/slide_quadrant';
export type { SlideQuoteNode } from './primitives/slide_quote';
export type { SlideSectionNode } from './primitives/slide_section';
export type { SlideSourceNode } from './primitives/slide_source';
export type { SlideSplitNode, SlideSplitSide } from './primitives/slide_split';
export type { SlideStackNode } from './primitives/slide_stack';
export type { SlideStatNode } from './primitives/slide_stat';
export type { SlideStatementNode } from './primitives/slide_statement';
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

export {
  type SlideLayoutBox,
  type SlideOverflow,
  type SlideOverlap,
  slideAuthoringNotes,
  slideOverflow,
  slideOverlaps,
} from './render';
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
