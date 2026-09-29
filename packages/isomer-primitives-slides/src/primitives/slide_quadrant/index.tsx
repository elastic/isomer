/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { quadrantPlaces, schema, type SlideQuadrantNode } from './schema';

export type { SlideQuadrant, SlideQuadrantNode } from './schema';

const { arrow, axisNames, separator } = slideDistillery.tokens.quadrant;

/** `y: low → high · x: low → high` */
const axes = ({ x, y }: SlideQuadrantNode): string =>
  (
    [
      [axisNames.y, y],
      [axisNames.x, x],
    ] as const
  )
    .map(
      ([name, { low, high }]) => `${name.value}: ${low} ${arrow.value} ${high}`
    )
    .join(` ${separator.value} `);

const cells = (node: SlideQuadrantNode) => {
  const places = quadrantPlaces(node);
  return node.quadrants.map(({ label, items }, index) => ({
    label: oneLine(label),
    place: oneLine(`(${places[index] ?? ''})`),
    items: items.map(oneLine).join(', '),
  }));
};

export const text = (node: SlideQuadrantNode): string =>
  [
    axes(node),
    ...cells(node).map(
      ({ label, place, items }) =>
        `${label} ${place}${items ? `: ${items}` : ''}`
    ),
  ]
    .map(oneLine)
    .join('\n');

export const markdown = (node: SlideQuadrantNode) => [
  md.paragraph(axes(node)),
  md.list(
    cells(node).map(({ label, place, items }) =>
      md.paragraph(md.strong(label), ` ${place}${items ? `: ${items}` : ''}`)
    )
  ),
];

export const slack = (node: SlideQuadrantNode): SlackBlock[] => [
  slackCaption(axes(node)),
  {
    type: 'section',
    fields: cells(node).map(({ label, place, items }) => ({
      type: 'mrkdwn',
      text: `${bold(label)} ${escapeMrkdwn(place)}${items ? `\n${escapeMrkdwn(items)}` : ''}`,
    })),
  },
];

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
    slack,
  },
});
