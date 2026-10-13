/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained body-node union. Update when a primitive is added or removed;
// `registry.test.ts` fails if this and `registry.ts` drift.
//
// The cycle with the container `types.ts` files (they import {@link SlideContentNode},
// this imports their node types) is type-only and intentional. Do not break it by
// deriving the union from the registry: that closes it at the value level (TS7022).

import type { AgendaSlideNode } from './primitives/agenda_slide';
import type { ClosingSlideNode } from './primitives/closing_slide';
import type { QuoteSlideNode } from './primitives/quote_slide';
import type { SectionSlideNode } from './primitives/section_slide';
import type { SlideAnnotatedRenderNode } from './primitives/slide_annotated_render';
import type { SlideBarsNode } from './primitives/slide_bars';
import type { SlideBulletListNode } from './primitives/slide_bullet_list';
import type { SlideCodeNode } from './primitives/slide_code';
import type { SlideCodeTraceNode } from './primitives/slide_code_trace';
import type { SlideColumnsNode } from './primitives/slide_columns';
import type { SlideCommandNode } from './primitives/slide_command';
import type { SlideDefinitionsNode } from './primitives/slide_definitions';
import type { SlideDeltaNode } from './primitives/slide_delta';
import type { SlideDiffNode } from './primitives/slide_diff';
import type { SlideFanoutNode } from './primitives/slide_fanout';
import type { SlideFrameNode } from './primitives/slide_frame';
import type { SlideGraphNode } from './primitives/slide_graph';
import type { SlideHeadingNode } from './primitives/slide_heading';
import type { SlideLanesNode } from './primitives/slide_lanes';
import type { SlideLayersNode } from './primitives/slide_layers';
import type { SlideListNode } from './primitives/slide_list';
import type { SlideMatrixNode } from './primitives/slide_matrix';
import type { SlidePipelineNode } from './primitives/slide_pipeline';
import type { SlideQuadrantNode } from './primitives/slide_quadrant';
import type { SlideRenderNode } from './primitives/slide_render';
import type { SlideRenderGridNode } from './primitives/slide_render_grid';
import type { SlideRoadmapNode } from './primitives/slide_roadmap';
import type { SlideSequenceNode } from './primitives/slide_sequence';
import type { SlideSourceNode } from './primitives/slide_source';
import type { SlideSplitLayoutNode } from './primitives/slide_split_layout';
import type { SlideStackLayoutNode } from './primitives/slide_stack_layout';
import type { SlideStatNode } from './primitives/slide_stat';
import type { SlideStatsNode } from './primitives/slide_stats';
import type { SlideTableNode } from './primitives/slide_table';
import type { SlideTerritoryGroupNode } from './primitives/slide_territory_group';
import type { SlideTimelineNode } from './primitives/slide_timeline';
import type { SlideTranscriptNode } from './primitives/slide_transcript';
import type { SlideTreeNode } from './primitives/slide_tree';
import type { SlideWindowLayoutNode } from './primitives/slide_window_layout';
import type { StatementSlideNode } from './primitives/statement_slide';
import type { TitleSlideNode } from './primitives/title_slide';

/** Discriminated union of every node type this pack defines. */
export type BodyNode =
  | AgendaSlideNode
  | ClosingSlideNode
  | QuoteSlideNode
  | SectionSlideNode
  | SlideAnnotatedRenderNode
  | SlideBarsNode
  | SlideBulletListNode
  | SlideCodeNode
  | SlideCodeTraceNode
  | SlideColumnsNode
  | SlideCommandNode
  | SlideDefinitionsNode
  | SlideDeltaNode
  | SlideDiffNode
  | SlideFanoutNode
  | SlideFrameNode
  | SlideGraphNode
  | SlideHeadingNode
  | SlideLanesNode
  | SlideLayersNode
  | SlideListNode
  | SlideMatrixNode
  | SlidePipelineNode
  | SlideQuadrantNode
  | SlideRenderNode
  | SlideRenderGridNode
  | SlideRoadmapNode
  | SlideSequenceNode
  | SlideSourceNode
  | SlideSplitLayoutNode
  | SlideStackLayoutNode
  | SlideStatNode
  | SlideStatsNode
  | SlideTableNode
  | SlideTerritoryGroupNode
  | SlideTimelineNode
  | SlideTranscriptNode
  | SlideTreeNode
  | SlideWindowLayoutNode
  | StatementSlideNode
  | TitleSlideNode;

/** A {@link BodyNode} that may nest inside a {@link SlideFrameNode}; frames cannot nest. */
export type SlideContentNode = Exclude<BodyNode, SlideFrameNode>;
