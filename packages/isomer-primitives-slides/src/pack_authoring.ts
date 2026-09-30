/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

// `z.toJSONSchema` drops `.refine` text, so cross-field rules are restated as each `$def` description.

/** Every primitive once, by what it draws, in the order an author usually chooses. */
export const slidePrimitiveGroups: readonly PrimitiveGroup[] = [
  {
    title: 'Slide structure',
    types: ['slideFrame', 'slideHeading', 'slideTitle'],
  },
  { title: 'Layout', types: ['slideSplit', 'slideStack'] },
  { title: 'Text', types: ['slideBulletList'] },
  { title: 'Diagrams', types: ['slideTerritoryGroup'] },
  {
    title: 'Data',
    types: ['slideStat', 'slideStats', 'slideDelta', 'slideBars'],
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
    slideStat:
      'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
    slideStats:
      'Two to four comparable numbers. A unit needs a value; leave value out to show a placeholder.',
    slideDelta:
      'One number before and after a change. change needs both values; leave a value out to show a placeholder.',
    slideBars:
      'Two to six bars in one unit. At most one item is highlighted; max, when given, is at least every value.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
  },
} satisfies PackAuthoringOptions;
