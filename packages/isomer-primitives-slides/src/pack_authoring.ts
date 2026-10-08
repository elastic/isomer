/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

/** Every primitive once, by what it draws, in the order an author usually chooses. */
export const slidePrimitiveGroups: readonly PrimitiveGroup[] = [
  {
    title: 'Slide structure',
    types: [
      'slideFrame',
      'slideHeading',
      'slideStatement',
      'slideQuote',
      'slideTitle',
      'slideSection',
      'slideAgenda',
      'slideClosing',
      'slideSource',
    ],
  },
  {
    title: 'Layout',
    types: ['slideSplit', 'slideStack', 'slideWindow'],
  },
  {
    title: 'Text',
    types: [
      'slideList',
      'slideBulletList',
      'slideDefinitions',
      'slideColumns',
      'slideRoadmap',
    ],
  },
  {
    title: 'Diagrams',
    types: [
      'slideFanout',
      'slidePipeline',
      'slideSequence',
      'slideLanes',
      'slideLayers',
      'slideTerritoryGroup',
      'slideGraph',
      'slideTimeline',
      'slideTree',
    ],
  },
  {
    title: 'Data',
    types: [
      'slideStat',
      'slideStats',
      'slideDelta',
      'slideBars',
      'slideTable',
      'slideMatrix',
      'slideQuadrant',
    ],
  },
  {
    title: 'Code',
    types: ['slideCode', 'slideDiff', 'slideCommand', 'slideTranscript'],
  },
  {
    title: 'Renders',
    types: ['slideRender', 'slideRenderGrid', 'slideAnnotatedRender'],
  },
];

export const slidesPackAuthoring = {
  groups: slidePrimitiveGroups,
} satisfies PackAuthoringOptions;
