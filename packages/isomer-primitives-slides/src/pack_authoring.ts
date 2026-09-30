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
    types: ['slideList', 'slideBulletList', 'slideDefinitions', 'slideColumns'],
  },
  { title: 'Diagrams', types: ['slideFanout', 'slideTerritoryGroup'] },
  { title: 'Code', types: ['slideCode'] },
  {
    title: 'Renders',
    types: ['slideRender', 'slideRenderGrid', 'slideAnnotatedRender'],
  },
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
    slideWindow:
      'One app window. Its body holds slide nodes, never a slideFrame or another slideWindow.',
    slideColumns:
      'Two to four columns. `highlight`, when set, is an index into `items`.',
    slideRender:
      'One render. Needs a `slide` reference or a `body`; the body holds whole slides but never another render.',
    slideRenderGrid:
      'One body on two to six surfaces, each surface once. The body never holds another render.',
    slideAnnotatedRender:
      'One slideRender with one to six pins. The render needs a `slide` reference or a `body`, and its body never holds another render.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slideAgenda:
      'Two to eight sections of the talk, in order. At most one section is current.',
    slideSource: 'One citation line.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
  },
} satisfies PackAuthoringOptions;
