/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained primitive registry. Keep alphabetically sorted.
// When a primitive is added or removed, update this file and `body_node.ts`;
// `registry.test.ts` fails if the two drift.

import { agendaSlidePrimitive } from './primitives/agenda_slide';
import { closingSlidePrimitive } from './primitives/closing_slide';
import { quoteSlidePrimitive } from './primitives/quote_slide';
import { sectionSlidePrimitive } from './primitives/section_slide';
import { slideAnnotatedRenderPrimitive } from './primitives/slide_annotated_render';
import { slideBarsPrimitive } from './primitives/slide_bars';
import { slideBulletListPrimitive } from './primitives/slide_bullet_list';
import { slideCodePrimitive } from './primitives/slide_code';
import { slideCodeTracePrimitive } from './primitives/slide_code_trace';
import { slideColumnsPrimitive } from './primitives/slide_columns';
import { slideCommandPrimitive } from './primitives/slide_command';
import { slideDefinitionsPrimitive } from './primitives/slide_definitions';
import { slideDeltaPrimitive } from './primitives/slide_delta';
import { slideDiffPrimitive } from './primitives/slide_diff';
import { slideFanoutPrimitive } from './primitives/slide_fanout';
import { slideFramePrimitive } from './primitives/slide_frame';
import { slideGraphPrimitive } from './primitives/slide_graph';
import { slideHeadingPrimitive } from './primitives/slide_heading';
import { slideLanesPrimitive } from './primitives/slide_lanes';
import { slideLayersPrimitive } from './primitives/slide_layers';
import { slideListPrimitive } from './primitives/slide_list';
import { slideMatrixPrimitive } from './primitives/slide_matrix';
import { slidePipelinePrimitive } from './primitives/slide_pipeline';
import { slideQuadrantPrimitive } from './primitives/slide_quadrant';
import { slideRenderPrimitive } from './primitives/slide_render';
import { slideRenderGridPrimitive } from './primitives/slide_render_grid';
import { slideRoadmapPrimitive } from './primitives/slide_roadmap';
import { slideSequencePrimitive } from './primitives/slide_sequence';
import { slideSourcePrimitive } from './primitives/slide_source';
import { slideSplitLayoutPrimitive } from './primitives/slide_split_layout';
import { slideStackLayoutPrimitive } from './primitives/slide_stack_layout';
import { slideStatPrimitive } from './primitives/slide_stat';
import { slideStatsPrimitive } from './primitives/slide_stats';
import { slideTablePrimitive } from './primitives/slide_table';
import { slideTerritoryGroupPrimitive } from './primitives/slide_territory_group';
import { slideTimelinePrimitive } from './primitives/slide_timeline';
import { slideTranscriptPrimitive } from './primitives/slide_transcript';
import { slideTreePrimitive } from './primitives/slide_tree';
import { slideWindowLayoutPrimitive } from './primitives/slide_window_layout';
import { statementSlidePrimitive } from './primitives/statement_slide';
import { titleSlidePrimitive } from './primitives/title_slide';

/** Every primitive definition this pack registers, in alphabetical order. */
export const slideDeckPrimitives = [
  agendaSlidePrimitive,
  closingSlidePrimitive,
  quoteSlidePrimitive,
  sectionSlidePrimitive,
  slideAnnotatedRenderPrimitive,
  slideBarsPrimitive,
  slideBulletListPrimitive,
  slideCodePrimitive,
  slideCodeTracePrimitive,
  slideColumnsPrimitive,
  slideCommandPrimitive,
  slideDefinitionsPrimitive,
  slideDeltaPrimitive,
  slideDiffPrimitive,
  slideFanoutPrimitive,
  slideFramePrimitive,
  slideGraphPrimitive,
  slideHeadingPrimitive,
  slideLanesPrimitive,
  slideLayersPrimitive,
  slideListPrimitive,
  slideMatrixPrimitive,
  slidePipelinePrimitive,
  slideQuadrantPrimitive,
  slideRenderPrimitive,
  slideRenderGridPrimitive,
  slideRoadmapPrimitive,
  slideSequencePrimitive,
  slideSourcePrimitive,
  slideSplitLayoutPrimitive,
  slideStackLayoutPrimitive,
  slideStatPrimitive,
  slideStatsPrimitive,
  slideTablePrimitive,
  slideTerritoryGroupPrimitive,
  slideTimelinePrimitive,
  slideTranscriptPrimitive,
  slideTreePrimitive,
  slideWindowLayoutPrimitive,
  statementSlidePrimitive,
  titleSlidePrimitive,
] as const;

/** `type` strings of {@link slideDeckPrimitives}. */
export const slidePrimitiveTypes = slideDeckPrimitives.map(
  (definition) => definition.type
);
