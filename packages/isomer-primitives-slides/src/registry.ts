/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained primitive registry. Keep alphabetically sorted.
// When a primitive is added or removed, update this file and `body_node.ts`;
// `registry.test.ts` fails if the two drift.

import { slideAnnotatedRenderPrimitive } from './primitives/slide_annotated_render';
import { slideBulletListPrimitive } from './primitives/slide_bullet_list';
import { slideCodePrimitive } from './primitives/slide_code';
import { slideColumnsPrimitive } from './primitives/slide_columns';
import { slideFramePrimitive } from './primitives/slide_frame';
import { slideHeadingPrimitive } from './primitives/slide_heading';
import { slideRenderPrimitive } from './primitives/slide_render';
import { slideRenderGridPrimitive } from './primitives/slide_render_grid';
import { slideSplitPrimitive } from './primitives/slide_split';
import { slideStackPrimitive } from './primitives/slide_stack';
import { slideTerritoryGroupPrimitive } from './primitives/slide_territory_group';
import { slideTitlePrimitive } from './primitives/slide_title';
import { slideWindowPrimitive } from './primitives/slide_window';

/** Every primitive definition this pack registers, in alphabetical order. */
export const slideDeckPrimitives = [
  slideAnnotatedRenderPrimitive,
  slideBulletListPrimitive,
  slideCodePrimitive,
  slideColumnsPrimitive,
  slideFramePrimitive,
  slideHeadingPrimitive,
  slideRenderPrimitive,
  slideRenderGridPrimitive,
  slideSplitPrimitive,
  slideStackPrimitive,
  slideTerritoryGroupPrimitive,
  slideTitlePrimitive,
  slideWindowPrimitive,
] as const;

/** `type` strings of {@link slideDeckPrimitives}. */
export const slidePrimitiveTypes = slideDeckPrimitives.map(
  (definition) => definition.type
);
