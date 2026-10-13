/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

/** Whole slides, then the frame, then layouts, then what a content slide draws. */
export const slidePrimitiveGroups: readonly PrimitiveGroup[] = [
  {
    title: 'Slides',
    types: [
      'titleSlide',
      'agendaSlide',
      'sectionSlide',
      'statementSlide',
      'quoteSlide',
      'closingSlide',
    ],
  },
  {
    title: 'Frame',
    types: ['slideFrame', 'slideHeading', 'slideSource'],
  },
  {
    title: 'Layouts',
    types: ['slideSplitLayout', 'slideStackLayout', 'slideWindowLayout'],
  },
  {
    title: 'Text',
    types: [
      'slideList',
      'slideBulletList',
      'slideDefinitions',
      'slideColumns',
      'slideTranscript',
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
      'slideRoadmap',
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
    types: ['slideCode', 'slideCodeTrace', 'slideDiff', 'slideCommand'],
  },
  {
    title: 'Renders',
    types: ['slideRender', 'slideRenderGrid', 'slideAnnotatedRender'],
  },
];

export const slidesPackAuthoring = {
  groups: slidePrimitiveGroups,
} satisfies PackAuthoringOptions;
