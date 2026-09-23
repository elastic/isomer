/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';
import { buildJsxShim } from '@elastic/isomer-sdk/author';

export const {
  Composition: Slide,
  SlideBulletList,
  SlideCard,
  SlideCardGroup,
  SlideCode,
  SlideCycle,
  SlideFlow,
  SlideFrame,
  SlideSplit,
  SlideStack,
  SlideTable,
  SlideTerritory,
  SlideTerritoryGroup,
  SlideTitle,
  SlideTranscript,
  SlideTurn,
  SlideWindow,
  toComposition,
} = buildJsxShim(slideDeckPrimitives);

/** Props every slide's frame shares. */
export const frame = {
  brand: 'Isomer',
  footer: 'elastic.github.io/isomer',
} as const;
