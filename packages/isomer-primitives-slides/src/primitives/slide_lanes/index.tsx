/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { bold, escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown, marksSlack, plainText } from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLanesNode } from './schema';

export type { SlideLanesLane, SlideLanesNode, SlideLanesNote } from './schema';

const arrow = ` ${slideDistillery.tokens.lanes.arrow.value} `;

const path = (steps: string[], join: string): string =>
  [...steps, join].map(oneLine).join(arrow);

export const text = ({ lanes, join, notes = [] }: SlideLanesNode): string =>
  [
    lanes
      .map(({ label, steps }) => `${oneLine(label)}: ${path(steps, join)}`)
      .join('\n'),
    notes
      .map(({ title, body }) => `${oneLine(title)}: ${plainText(body)}`)
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = ({ lanes, join, notes = [] }: SlideLanesNode) => [
  md.list(
    lanes.map(({ label, steps }) =>
      md.paragraph(md.strong(`${label}:`), ' ', path(steps, join))
    )
  ),
  ...notes.map(({ title, body }) =>
    md.paragraph(md.strong(`${title}:`), ' ', ...marksMarkdown(body))
  ),
];

export const slack = ({
  lanes,
  join,
  notes = [],
}: SlideLanesNode): SlackBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: lanes
        .map(
          ({ label, steps }) =>
            `${bold(`${oneLine(label)}:`)} ${escapeMrkdwn(path(steps, join))}`
        )
        .join('\n'),
    },
  },
  ...(notes.length > 0
    ? [
        {
          type: 'section',
          fields: notes.map(({ title, body }) => ({
            type: 'mrkdwn',
            text: `${bold(oneLine(title))}\n${oneLine(marksSlack(body))}`,
          })),
        } satisfies SlackBlock,
      ]
    : []),
];

/** Catalog, schema, and renderers for {@link SlideLanesNode}. */
export const slideLanesPrimitive = definePrimitive({
  type: 'slideLanes',
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
