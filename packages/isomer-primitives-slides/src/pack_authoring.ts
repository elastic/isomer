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
    types: ['slideFrame', 'slideHeading', 'slideTitle'],
  },
  { title: 'Layout', types: ['slideSplit', 'slideStack'] },
  {
    title: 'Text',
    types: ['slideBulletList'],
  },
  {
    title: 'Diagrams',
    types: ['slideFanout', 'slideTerritoryGroup'],
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
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
  },
} satisfies PackAuthoringOptions;
