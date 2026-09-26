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
  SlideAgenda,
  SlideAnnotatedRender,
  SlideBars,
  SlideBulletList,
  SlideClosing,
  SlideCode,
  SlideColumns,
  SlideCommand,
  SlideDefinitions,
  SlideDelta,
  SlideDiff,
  SlideFanout,
  SlideFrame,
  SlideGraph,
  SlideHeading,
  SlideLanes,
  SlideLayers,
  SlideList,
  SlideMatrix,
  SlidePipeline,
  SlideQuadrant,
  SlideQuote,
  SlideRender,
  SlideRenderGrid,
  SlideRoadmap,
  SlideSection,
  SlideSequence,
  SlideSource,
  SlideSplit,
  SlideStack,
  SlideStat,
  SlideStatement,
  SlideStats,
  SlideTable,
  SlideTerritory,
  SlideTerritoryGroup,
  SlideTimeline,
  SlideTitle,
  SlideTranscript,
  SlideTree,
  SlideTurn,
  SlideWindow,
  toComposition,
  toJsx: printJsx,
} = buildJsxShim(slideDeckPrimitives);

/** A composition as JSX in this deck's own terms, rooted at `Slide`. */
export const toJsx = (composition: Parameters<typeof printJsx>[0]): string =>
  printJsx(composition, { root: 'Slide' });

/** Footer props every slide shares. */
export const frame = {
  brand: 'Isomer',
  url: 'https://elastic.github.io/isomer',
} as const;
