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
  { title: 'Layout', types: ['slideSplit', 'slideStack', 'slideWindow'] },
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
      'slideTimeline',
      'slidePipeline',
      'slideSequence',
      'slideLanes',
      'slideGraph',
      'slideFanout',
      'slideTree',
      'slideLayers',
      'slideTerritoryGroup',
      'slideQuadrant',
    ],
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
    types: [
      'slideCode',
      'slideDiff',
      'slideCommand',
      'slideTranscript',
      'slideRender',
      'slideAnnotatedRender',
      'slideRenderGrid',
    ],
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
    slideWindow:
      'Application chrome around slide nodes. Its body never holds a slideFrame or another slideWindow.',
    slideTable:
      'A grid of short cells. Give either rows or groups, not both; every row has exactly one cell per column.',
    slideMatrix:
      'Yes, partial, or no marks for one to eight rows against two to six columns. Every row has exactly one mark per column.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slideDiff:
      'One snippet with changed lines marked. Each entry in lines is one line of source, with no newline.',
    slideCommand:
      'One shell command on a single line, without the prompt. highlight, when given, is a prefix of command.',
    slidePipeline:
      'Steps on one rail. Without spans: numbered steps with bodies, optional start and end chips. With spans: steps are chips with no body and no start or end, and each span brackets steps from..to by index (from ≤ to < steps.length); spans do not overlap.',
    slideRoadmap:
      'Two to four horizons, left to right, each with one to four items. At most one column is current.',
    slideAgenda:
      'Two to eight sections of the talk, in order. At most one section is current.',
    slideSource:
      'One citation line. When present, it is the last node in the frame body.',
    slideTimeline:
      'Three to five points on a rail. At most one item is current.',
    slideStat:
      'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
    slideStats:
      'Two to four comparable numbers. A unit needs a value; leave value out to show a placeholder.',
    slideBars:
      'Two to six bars in one unit. At most one item is highlighted; max, when given, is at least every value.',
    slideGraph:
      'A fixed layout: two to four main nodes left to right, joined in order by edges, plus at most one node placed above and one below, each joined by one edge to a main node.',
    slideLanes: 'Exactly two lanes that converge on join.',
    slideLayers:
      'Three to six layers, top to bottom. Each layer has exactly one of body or chips.',
    slideSequence:
      'Messages between 3–5 actors. Actor ids are unique; every message names two different actors by id in from and to; every actor sends or receives at least one message.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
    slideRender:
      'An embedded render of another slide or composition. Give slide, composition, or both; an embedded composition cannot contain another render.',
    slideAnnotatedRender:
      'One slideRender with one to six numbered pins on it. Pin x and y are percentages from the render’s left and top edges; the render’s composition cannot contain another render.',
    slideRenderGrid:
      'One composition rendered on several surfaces. The composition cannot contain another render.',
  },
} satisfies PackAuthoringOptions;
