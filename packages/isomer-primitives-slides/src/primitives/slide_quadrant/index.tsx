/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideQuadrantNode } from './schema';

export type { SlideQuadrant, SlideQuadrantNode } from './schema';

const { arrow, separator } = slideDistillery.tokens.quadrant;

/** Where each quadrant sits, in schema order: TL, TR, BL, BR. */
const places = [
  'high y, low x',
  'high y, high x',
  'low y, low x',
  'low y, high x',
] as const;

const axes = ({ x, y }: SlideQuadrantNode): string =>
  `y: ${y.low} ${arrow.value} ${y.high} ${separator.value} x: ${x.low} ${arrow.value} ${x.high}`;

const cells = (
  { quadrants }: SlideQuadrantNode,
  line: (label: string, place: string, items: string) => string
): string[] =>
  quadrants.map(({ label, items }, index) =>
    line(
      label,
      places[index] ?? '',
      items.length > 0 ? `: ${items.join(', ')}` : ''
    )
  );

/** Text renderer for {@link SlideQuadrantNode}: the axes, then one line per quadrant. */
export const text = (node: SlideQuadrantNode): string =>
  [
    axes(node),
    ...cells(node, (label, place, items) => `${label} (${place})${items}`),
  ].join('\n');

/** Markdown renderer for {@link SlideQuadrantNode}: the axes, then a bullet per quadrant. */
export const markdown = (node: SlideQuadrantNode): string =>
  [
    axes(node),
    cells(
      node,
      (label, place, items) => `- **${label}** (${place})${items}`
    ).join('\n'),
  ].join('\n\n');

/** Catalog, schema, and renderers for {@link SlideQuadrantNode}. */
export const slideQuadrantPrimitive = definePrimitive({
  type: 'slideQuadrant',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
