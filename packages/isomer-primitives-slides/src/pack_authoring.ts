/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions, PrimitiveGroup } from '@elastic/isomer-sdk';

import { slideGraphShape } from './primitives/slide_graph/schema';

// `z.toJSONSchema` drops refinements; a `describe` entry may state a rule from `primitives/cross_field.ts`.

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
  describe: {
    slideFrame:
      'One whole slide. Its body holds the slide content top to bottom, never a slideFrame: frames never nest.',
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
    slidePipeline:
      'Steps on one rail. Without spans: numbered steps with bodies, optional start and end chips. With spans: steps are chips with no body, no start or end, and no size, and each span brackets steps from..to by index (from ≤ to < steps.length); spans do not overlap.',
    slideSequence:
      'Two to ten messages between three to five actors. Actor ids are unique; every message names two different actors by id in from and to; every actor sends or receives at least one message.',
    slideLanes: 'Exactly two lanes that converge on join.',
    slideLayers:
      'Three to six layers, top to bottom. Each layer has exactly one of body or chips.',
    slideStat:
      'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
    slideStats:
      'Two to four comparable numbers. A unit needs a value; leave value out to show a placeholder.',
    slideDelta:
      'One number before and after a change. change needs both values; leave a value out to show a placeholder.',
    slideBars:
      'Two to six bars in one unit. At most one item is highlighted; max, when given, is at least every value.',
    slideTable:
      'A grid of short cells. Give either rows or groups, not both; every row has exactly one cell per column; twelve rows at most across all groups.',
    slideMatrix:
      'Yes, partial, or no marks for one to eight rows against two to six columns. Every row has exactly one mark per column; highlight, when given, is an index into columns.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slideDiff:
      'One snippet with changed lines marked. Each entry in lines is one line of source, with no newline.',
    slideCommand:
      'One shell command on a single line, without the prompt. highlightPrefix, when given, starts command.',
    slideAgenda:
      'Two to eight sections of the talk, in order. At most one section is current.',
    slideSource: 'One citation line.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
    slideGraph: `Terms joined by arrows. ${slideGraphShape}. Node ids are unique. Every edge names a node id. No edge repeats. At most one node is emphasized.`,
    slideRoadmap: 'Two to four horizons. At most one column is current.',
    slideTimeline: 'Three to five dated points. At most one item is current.',
  },
} satisfies PackAuthoringOptions;
