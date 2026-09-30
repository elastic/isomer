/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  richTextBreak,
  richTextSection,
  slackFields,
  slackRichText,
  slackSection,
} from '../../render';
import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun as run,
} from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
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
      .map(
        ({ label, steps, tone }) =>
          `${toneCueText(tone)}${oneLine(label)}: ${path(steps, join)}`
      )
      .join('\n'),
    notes
      .map(({ title, body }) => `${oneLine(title)}: ${plainText(body)}`)
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = ({ lanes, join, notes = [] }: SlideLanesNode) => [
  md.list(
    lanes.map(({ label, steps, tone }) =>
      md.paragraph(
        toneCueText(tone),
        md.strong(`${label}:`),
        ' ',
        path(steps, join)
      )
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
  slackSection(
    lanes
      .map(
        ({ label, steps, tone }) =>
          `${toneCueText(tone)}${bold(`${oneLine(label)}:`)} ${escapeMrkdwn(path(steps, join))}`
      )
      .join('\n'),
    () =>
      slackRichText(
        ...lanes.map(({ label, steps, tone }, index) =>
          richTextSection(
            ...(tone ? [run(toneCueText(tone))] : []),
            run(`${label}:`, { bold: true }),
            run(` ${path(steps, join)}`),
            ...(index < lanes.length - 1 ? [richTextBreak] : [])
          )
        )
      )
  ),
  ...(notes.length > 0
    ? [
        slackFields(
          notes.map(
            ({ title, body }) =>
              `${bold(oneLine(title))}\n${oneLine(marksSlack(body))}`
          ),
          () =>
            slackRichText(
              ...notes.map(({ title, body }, index) =>
                richTextSection(
                  run(title, { bold: true }),
                  richTextBreak,
                  ...marksRichText(body),
                  ...(index < notes.length - 1 ? [richTextBreak] : [])
                )
              )
            )
        ),
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
