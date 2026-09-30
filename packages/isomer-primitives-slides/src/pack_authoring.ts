/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

import { slideGraphShape } from './primitives/slide_graph/schema';

// `z.toJSONSchema` drops `.refine` text, so cross-field rules are restated as each `$def` description.

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
    types: ['slideList', 'slideBulletList', 'slideDefinitions', 'slideRoadmap'],
  },
  {
    title: 'Diagrams',
    types: [
      'slideFanout',
      'slideTerritoryGroup',
      'slideGraph',
      'slideTimeline',
      'slideTree',
    ],
  },
  { title: 'Code', types: ['slideCode'] },
];

export const slidesPackAuthoring = {
  groups: slidePrimitiveGroups,
  describe: {
    slideFrame:
      'One whole slide. Its body holds the slide content top to bottom; a slideFrame never appears inside another node.',
    slideSplit:
      'Two columns. Each pane holds one to six slide nodes, never a slideFrame. A pane tone needs a pane label.',
    slideStack:
      'Nodes stacked vertically in a one-node slot, never a slideFrame.',
    slideTitle:
      'The title slide. Its aside is one slide node, never a slideFrame.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slideAgenda:
      'Two to eight sections of the talk, in order. At most one section is current.',
    slideSource: 'One citation line.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
    slideGraph: `Terms joined by arrows. ${slideGraphShape}. Every edge names a node id.`,
    slideRoadmap: 'Two to four horizons. At most one column is current.',
    slideTimeline: 'Three to five dated points. At most one item is current.',
  },
} satisfies PackAuthoringOptions;
