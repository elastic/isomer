/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

// `z.toJSONSchema` drops `.refine` text, so each primitive's cross-field
// constraints are restated here as its `$def` description.

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
  { title: 'Layout', types: ['slideSplit', 'slideStack'] },
  {
    title: 'Text',
    types: ['slideList', 'slideBulletList', 'slideDefinitions'],
  },
  {
    title: 'Diagrams',
    types: ['slideFanout', 'slideTerritoryGroup', 'slideQuadrant'],
  },
  {
    title: 'Numbers',
    types: [
      'slideStat',
      'slideStats',
      'slideDelta',
      'slideBars',
      'slideMatrix',
      'slideTable',
    ],
  },
  {
    title: 'Code and renders',
    types: ['slideCode'],
  },
];

/** This pack's contribution to a runtime's authoring JSON Schema and index. */
export const slidesPackAuthoring = {
  groups: slidePrimitiveGroups,
  describe: {
    slideFrame:
      'One whole slide. Its body holds the slide content top to bottom; a slideFrame never appears inside another node.',
    slideSplit:
      'Two columns. Items are strings or slide nodes, never a slideFrame.',
    slideStack:
      'Nodes stacked vertically inside a split column or window, never a slideFrame.',
    slideTitle:
      'The title slide. Its aside is one slide node, never a slideFrame.',
    slideTable:
      'A grid of short cells. Give either rows or groups, not both; every row has exactly one cell per column.',
    slideMatrix:
      'Yes, partial, or no marks for one to eight rows against two to six columns. Every row has exactly one mark per column.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slideAgenda:
      'Two to eight sections of the talk, in order. At most one section is current.',
    slideSource:
      'One citation line. When present, it is the last node in the frame body.',
    slideStat:
      'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
    slideDelta:
      'One number before and after a change. change needs both values; leave a value out to show a placeholder.',
    slideStats:
      'Two to four comparable numbers. A unit needs a value; leave value out to show a placeholder.',
    slideBars:
      'Two to six bars in one unit. At most one item is highlighted; max, when given, is at least every value.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
  },
} satisfies PackAuthoringOptions;
