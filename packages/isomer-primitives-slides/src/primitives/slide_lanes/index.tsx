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
  stripMarks,
} from '../../render/marks';
import { hasMrkdwnDelimiter } from '../../render/slack_text';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLanesNode, type SlideLanesNote } from './schema';

export type { SlideLanesLane, SlideLanesNode, SlideLanesNote } from './schema';

const arrow = ` ${slideDistillery.tokens.lanes.arrow.value} `;

const path = (steps: string[], join: string): string =>
  [...steps, join].map(oneLine).join(arrow);

/** A lane's name as drawn, in capitals. */
const shown = (label: string): string => oneLine(label).toUpperCase();

export const text = ({ lanes, join, notes = [] }: SlideLanesNode): string =>
  [
    lanes
      .map(
        ({ label, steps, tone }) =>
          `${toneCueText(tone)}${shown(label)}: ${path(steps, join)}`
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
        md.strong(`${shown(label)}:`),
        ' ',
        path(steps, join)
      )
    )
  ),
  ...notes.map(({ title, body }) =>
    md.paragraph(md.strong(`${title}:`), ' ', ...marksMarkdown(body))
  ),
];

const lanesRichText = ({ lanes, join }: SlideLanesNode): SlackBlock =>
  slackRichText(
    ...lanes.map(({ label, steps, tone }, index) =>
      richTextSection(
        ...(tone ? [run(toneCueText(tone))] : []),
        run(`${shown(label)}:`, { bold: true }),
        run(` ${path(steps, join)}`),
        ...(index < lanes.length - 1 ? [richTextBreak] : [])
      )
    )
  );

const notesRichText = (notes: SlideLanesNote[]): SlackBlock =>
  slackRichText(
    ...notes.map(({ title, body }, index) =>
      richTextSection(
        run(title, { bold: true }),
        richTextBreak,
        ...marksRichText(body),
        ...(index < notes.length - 1 ? [richTextBreak] : [])
      )
    )
  );

// `mrkdwn` would read an authored `*`, `_`, `~`, or backtick as formatting, so such text goes to literal rich text.
export const slack = (node: SlideLanesNode): SlackBlock[] => {
  const { lanes, join, notes = [] } = node;
  const lanesLiteral = hasMrkdwnDelimiter(
    [join, ...lanes.flatMap(({ label, steps }) => [label, ...steps])].join('')
  );
  const notesLiteral = hasMrkdwnDelimiter(
    notes.map(({ title, body }) => title + stripMarks(body)).join('')
  );
  return [
    lanesLiteral
      ? lanesRichText(node)
      : slackSection(
          lanes
            .map(
              ({ label, steps, tone }) =>
                `${toneCueText(tone)}${bold(`${shown(label)}:`)} ${escapeMrkdwn(path(steps, join))}`
            )
            .join('\n'),
          () => lanesRichText(node)
        ),
    ...(notes.length === 0
      ? []
      : [
          notesLiteral
            ? notesRichText(notes)
            : slackFields(
                notes.map(
                  ({ title, body }) =>
                    `${bold(oneLine(title))}\n${oneLine(marksSlack(body))}`
                ),
                () => notesRichText(notes)
              ),
        ]),
  ];
};

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
