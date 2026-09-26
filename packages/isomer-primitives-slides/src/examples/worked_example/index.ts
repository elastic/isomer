/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A worked deck assembled from each primitive's canonical example. A deck is a
// `Composition[]`, a sequence Isomer deliberately does not model, because
// sequencing is routing and routing belongs to the host.

import type { Composition } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import { example as closing } from '../../primitives/slide_closing/examples';
import { example as code } from '../../primitives/slide_code/examples';
import { example as columns } from '../../primitives/slide_columns/examples';
import type { SlideFrameNode } from '../../primitives/slide_frame';
import { example as graph } from '../../primitives/slide_graph/examples';
import type { SlideHeadingNode } from '../../primitives/slide_heading';
import { example as lanes } from '../../primitives/slide_lanes/examples';
import { example as pipeline } from '../../primitives/slide_pipeline/examples';
import { example as section } from '../../primitives/slide_section/examples';
import type { SlideSplitNode } from '../../primitives/slide_split';
import { example as split } from '../../primitives/slide_split/examples';
import { example as stat } from '../../primitives/slide_stat/examples';
import { example as stats } from '../../primitives/slide_stats/examples';
import { example as table } from '../../primitives/slide_table/examples';
import { example as timeline } from '../../primitives/slide_timeline/examples';
import { example as title } from '../../primitives/slide_title/examples';

const footer = {
  brand: 'Crate',
  url: 'https://example.com/crate',
};

const slide = (
  name: string,
  body: readonly SlideContentNode[],
  section?: { sectionNumber: string; section: string },
  tone: 'page' | 'inverse' = 'page'
): Composition => {
  const frame: SlideFrameNode = {
    type: 'slideFrame',
    ...footer,
    ...section,
    tone,
    body,
  };
  return { type: 'view', title: name, body: [frame] };
};

const heading = (title: string, lede?: string): SlideHeadingNode => ({
  type: 'slideHeading',
  title,
  ...(lede === undefined ? {} : { lede }),
});

const tableAndCode: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'wideLeft',
  left: { items: [table] },
  right: { items: [code] },
};

const settlement = { sectionNumber: '02', section: 'Settlement' };
const platform = { sectionNumber: '03', section: 'Platform' };

/** Example compositions covering this pack's primitives. */
export const deck: Composition[] = [
  slide('Crate', [title], undefined, 'inverse'),
  slide('Section', [section], settlement, 'inverse'),
  slide(
    'Timeline',
    [
      heading(
        'Every channel asked for the same basket',
        'Each one wanted to order without calling a store.'
      ),
      timeline,
    ],
    settlement
  ),
  slide(
    'Pipeline',
    [heading('Every refund runs the same four steps'), pipeline, stat],
    settlement
  ),
  slide(
    'Split',
    [heading('Payments owns the money. Merchants own the goods.'), split],
    settlement
  ),
  slide(
    'Lanes',
    [heading('Web and phone orders meet at one step'), lanes],
    platform
  ),
  slide('Graph', [heading('Four terms describe checkout'), graph], platform),
  slide(
    'Numbers',
    [heading('Checkout held through the spring sale'), stats],
    platform
  ),
  slide(
    'Columns',
    [heading('Three ways to ship a release'), columns],
    platform
  ),
  slide(
    'Table and code',
    [heading('Refund states, and where they are set'), tableAndCode],
    platform
  ),
  slide('Closing', [closing], platform, 'inverse'),
];
