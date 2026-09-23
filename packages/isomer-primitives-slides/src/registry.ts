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
import { slideCardGroupPrimitive } from './primitives/slide_card_group';
import { slideCodePrimitive } from './primitives/slide_code';
import { slideCyclePrimitive } from './primitives/slide_cycle';
import { slideFlowPrimitive } from './primitives/slide_flow';
import { slideFramePrimitive } from './primitives/slide_frame';
import { slideSplitPrimitive } from './primitives/slide_split';
import { slideStackPrimitive } from './primitives/slide_stack';
import { slideTablePrimitive } from './primitives/slide_table';
import { slideTerritoryGroupPrimitive } from './primitives/slide_territory_group';
import { slideTitlePrimitive } from './primitives/slide_title';
import { slideTranscriptPrimitive } from './primitives/slide_transcript';
import { slideWindowPrimitive } from './primitives/slide_window';

/** The thirteen primitive definitions this pack registers, in alphabetical order. */
export const slideDeckPrimitives = [
  slideBulletListPrimitive,
  slideCardGroupPrimitive,
  slideCodePrimitive,
  slideCyclePrimitive,
  slideFlowPrimitive,
  slideFramePrimitive,
  slideSplitPrimitive,
  slideStackPrimitive,
  slideTablePrimitive,
  slideTerritoryGroupPrimitive,
  slideTitlePrimitive,
  slideTranscriptPrimitive,
  slideWindowPrimitive,
] as const;

/** `type` strings of {@link slideDeckPrimitives}. */
export const slidePrimitiveTypes = slideDeckPrimitives.map(
  (definition) => definition.type
);
