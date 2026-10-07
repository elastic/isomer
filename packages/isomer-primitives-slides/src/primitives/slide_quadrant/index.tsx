/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { richTextRun } from '../../render/marks';
import { oneLine } from '../../render/one_line';
import {
  richTextBreak,
  richTextSection,
  slackBold,
  slackFields,
  slackRichText,
} from '../../render/slack_text';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { quadrantPlaces, schema, type SlideQuadrantNode } from './schema';

export type { SlideQuadrant, SlideQuadrantNode } from './schema';

const { arrow, axisNames, listJoiner, separator, termJoiner } =
  slideDistillery.tokens.quadrant;

/** `y: LOW → HIGH · x: LOW → HIGH`, the ends uppercase as drawn. */
const axes = ({ x, y }: SlideQuadrantNode): string =>
  (
    [
      [axisNames.y, y],
      [axisNames.x, x],
    ] as const
  )
    .map(
      ([name, { low, high }]) =>
        `${name.value}${termJoiner.value}${low.toUpperCase()} ${arrow.value} ${high.toUpperCase()}`
    )
    .join(` ${separator.value} `);

/** `label (place): items`, the highlighted label leading with its cue. */
const cells = (node: SlideQuadrantNode) => {
  const places = quadrantPlaces(node);
  return node.quadrants.map(({ label, items }, index) => ({
    label: oneLine(
      index === node.highlight ? `${toneCueText('primary')}${label}` : label
    ),
    rest: oneLine(
      `(${places[index] ?? ''})${items.length > 0 ? `${termJoiner.value}${items.join(listJoiner.value)}` : ''}`
    ),
  }));
};

export const text = (node: SlideQuadrantNode): string =>
  [
    oneLine(axes(node)),
    ...cells(node).map(({ label, rest }) => `${label} ${rest}`),
  ].join('\n');

export const markdown = (node: SlideQuadrantNode) => [
  md.paragraph(oneLine(axes(node))),
  md.list(
    cells(node).map(({ label, rest }) =>
      md.paragraph(md.strong(label), ` ${rest}`)
    )
  ),
];

export const slack = (node: SlideQuadrantNode): SlackBlock[] => {
  const { x, y, quadrants } = node;
  const lines = cells(node);
  return [
    slackCaption(axes(node)),
    slackFields(
      lines.map(
        ({ label, rest }) => `${slackBold(label)} ${escapeMrkdwn(rest)}`
      ),
      () =>
        slackRichText(
          richTextSection(
            ...lines.flatMap(({ label, rest }, index) => [
              ...(index > 0 ? [richTextBreak] : []),
              richTextRun(label, { bold: true }),
              richTextRun(` ${rest}`),
            ])
          )
        ),
      [
        x.low,
        x.high,
        y.low,
        y.high,
        ...quadrants.flatMap(({ label, items }) => [label, ...items]),
      ]
    ),
  ];
};

/** Catalog, schema, and renderers for {@link SlideQuadrantNode}. */
export const slideQuadrantPrimitive = definePrimitive({
  type: 'slideQuadrant',
  catalog,
  icon,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
