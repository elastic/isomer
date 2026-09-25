/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained primitive registry. Keep alphabetically sorted.
// When a primitive is added or removed, update this file and `body_node.ts`;
// `registry.test.ts` fails if the two drift.

import { slideBulletListPrimitive } from './primitives/slide_bullet_list';
import { slideClosingPrimitive } from './primitives/slide_closing';
import { slideCodePrimitive } from './primitives/slide_code';
import { slideColumnsPrimitive } from './primitives/slide_columns';
import { slideDefinitionsPrimitive } from './primitives/slide_definitions';
import { slideFanoutPrimitive } from './primitives/slide_fanout';
import { slideFramePrimitive } from './primitives/slide_frame';
import { slideGraphPrimitive } from './primitives/slide_graph';
import { slideHeadingPrimitive } from './primitives/slide_heading';
import { slideLanesPrimitive } from './primitives/slide_lanes';
import { slideListPrimitive } from './primitives/slide_list';
import { slidePipelinePrimitive } from './primitives/slide_pipeline';
import { slideRenderPrimitive } from './primitives/slide_render';
import { slideRenderGridPrimitive } from './primitives/slide_render_grid';
import { slideSectionPrimitive } from './primitives/slide_section';
import { slideSplitPrimitive } from './primitives/slide_split';
import { slideStackPrimitive } from './primitives/slide_stack';
import { slideStatPrimitive } from './primitives/slide_stat';
import { slideStatsPrimitive } from './primitives/slide_stats';
import { slideTablePrimitive } from './primitives/slide_table';
import { slideTerritoryGroupPrimitive } from './primitives/slide_territory_group';
import { slideTimelinePrimitive } from './primitives/slide_timeline';
import { slideTitlePrimitive } from './primitives/slide_title';
import { slideTranscriptPrimitive } from './primitives/slide_transcript';
import { slideTreePrimitive } from './primitives/slide_tree';
import { slideWindowPrimitive } from './primitives/slide_window';

/** Every primitive definition this pack registers, in alphabetical order. */
export const slideDeckPrimitives = [
  slideBulletListPrimitive,
  slideClosingPrimitive,
  slideCodePrimitive,
  slideColumnsPrimitive,
  slideDefinitionsPrimitive,
  slideFanoutPrimitive,
  slideFramePrimitive,
  slideGraphPrimitive,
  slideHeadingPrimitive,
  slideLanesPrimitive,
  slideListPrimitive,
  slidePipelinePrimitive,
  slideRenderPrimitive,
  slideRenderGridPrimitive,
  slideSectionPrimitive,
  slideSplitPrimitive,
  slideStackPrimitive,
  slideStatPrimitive,
  slideStatsPrimitive,
  slideTablePrimitive,
  slideTerritoryGroupPrimitive,
  slideTimelinePrimitive,
  slideTitlePrimitive,
  slideTranscriptPrimitive,
  slideTreePrimitive,
  slideWindowPrimitive,
] as const;

/** `type` strings of {@link slideDeckPrimitives}. */
export const slidePrimitiveTypes = slideDeckPrimitives.map(
  (definition) => definition.type
);
