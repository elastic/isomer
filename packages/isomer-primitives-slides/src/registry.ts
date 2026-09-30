/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained primitive registry. Keep alphabetically sorted.
// When a primitive is added or removed, update this file and `body_node.ts`;
// `registry.test.ts` fails if the two drift.

import { slideAgendaPrimitive } from './primitives/slide_agenda';
import { slideBarsPrimitive } from './primitives/slide_bars';
import { slideBulletListPrimitive } from './primitives/slide_bullet_list';
import { slideClosingPrimitive } from './primitives/slide_closing';
import { slideCodePrimitive } from './primitives/slide_code';
import { slideCommandPrimitive } from './primitives/slide_command';
import { slideDefinitionsPrimitive } from './primitives/slide_definitions';
import { slideDeltaPrimitive } from './primitives/slide_delta';
import { slideDiffPrimitive } from './primitives/slide_diff';
import { slideFanoutPrimitive } from './primitives/slide_fanout';
import { slideFramePrimitive } from './primitives/slide_frame';
import { slideHeadingPrimitive } from './primitives/slide_heading';
import { slideListPrimitive } from './primitives/slide_list';
import { slideMatrixPrimitive } from './primitives/slide_matrix';
import { slideQuadrantPrimitive } from './primitives/slide_quadrant';
import { slideQuotePrimitive } from './primitives/slide_quote';
import { slideSectionPrimitive } from './primitives/slide_section';
import { slideSourcePrimitive } from './primitives/slide_source';
import { slideSplitPrimitive } from './primitives/slide_split';
import { slideStackPrimitive } from './primitives/slide_stack';
import { slideStatPrimitive } from './primitives/slide_stat';
import { slideStatementPrimitive } from './primitives/slide_statement';
import { slideStatsPrimitive } from './primitives/slide_stats';
import { slideTablePrimitive } from './primitives/slide_table';
import { slideTerritoryGroupPrimitive } from './primitives/slide_territory_group';
import { slideTitlePrimitive } from './primitives/slide_title';
import { slideTranscriptPrimitive } from './primitives/slide_transcript';

/** Every primitive definition this pack registers, in alphabetical order. */
export const slideDeckPrimitives = [
  slideAgendaPrimitive,
  slideBarsPrimitive,
  slideBulletListPrimitive,
  slideClosingPrimitive,
  slideCodePrimitive,
  slideCommandPrimitive,
  slideDefinitionsPrimitive,
  slideDeltaPrimitive,
  slideDiffPrimitive,
  slideFanoutPrimitive,
  slideFramePrimitive,
  slideHeadingPrimitive,
  slideListPrimitive,
  slideMatrixPrimitive,
  slideQuadrantPrimitive,
  slideQuotePrimitive,
  slideSectionPrimitive,
  slideSourcePrimitive,
  slideSplitPrimitive,
  slideStackPrimitive,
  slideStatPrimitive,
  slideStatementPrimitive,
  slideStatsPrimitive,
  slideTablePrimitive,
  slideTerritoryGroupPrimitive,
  slideTitlePrimitive,
  slideTranscriptPrimitive,
] as const;

/** `type` strings of {@link slideDeckPrimitives}. */
export const slidePrimitiveTypes = slideDeckPrimitives.map(
  (definition) => definition.type
);
