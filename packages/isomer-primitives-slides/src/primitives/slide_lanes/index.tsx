/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  richTextBreak,
  richTextSection,
  slackBold,
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
import { oneLine } from '../../render/one_line';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLanesNode, type SlideLanesNote } from './schema';

export type { SlideLanesLane, SlideLanesNode, SlideLanesNote } from './schema';

const arrow = ` ${slideDistillery.tokens.lanes.arrow.value} `;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

const path = (steps: string[], join: string): string =>
  [...steps, join].map(oneLine).join(arrow);

/** A lane's name as drawn, in capitals. */
const shown = (label: string): string => oneLine(label).toUpperCase();

export const text = ({ lanes, join, notes = [] }: SlideLanesNode): string =>
  [
    lanes
      .map(
        ({ label, steps, tone }) =>
          `${toneCueText(tone)}${shown(label)}${termJoiner}${path(steps, join)}`
      )
      .join('\n'),
    notes
      .map(
        ({ title, body }) => `${oneLine(title)}${termJoiner}${plainText(body)}`
      )
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = ({ lanes, join, notes = [] }: SlideLanesNode) => [
  md.list(
    lanes.map(({ label, steps, tone }) =>
      md.paragraph(
        toneCueText(tone),
        md.strong(shown(label)),
        termJoiner,
        path(steps, join)
      )
    )
  ),
  ...notes.map(({ title, body }) =>
    md.paragraph(md.strong(title), termJoiner, ...marksMarkdown(body))
  ),
];

const lanesRichText = ({ lanes, join }: SlideLanesNode): SlackBlock =>
  slackRichText(
    ...lanes.map(({ label, steps, tone }, index) =>
      richTextSection(
        ...(tone ? [run(toneCueText(tone))] : []),
        run(shown(label), { bold: true }),
        run(`${termJoiner}${path(steps, join)}`),
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

export const slack = (node: SlideLanesNode): SlackBlock[] => {
  const { lanes, join, notes = [] } = node;
  return [
    slackSection(
      lanes
        .map(
          ({ label, steps, tone }) =>
            `${toneCueText(tone)}${slackBold(shown(label))}${termJoiner}${escapeMrkdwn(path(steps, join))}`
        )
        .join('\n'),
      () => lanesRichText(node),
      [join, ...lanes.flatMap(({ label, steps }) => [label, ...steps])]
    ),
    ...(notes.length === 0
      ? []
      : [
          slackFields(
            notes.map(
              ({ title, body }) =>
                `${slackBold(title)}\n${oneLine(marksSlack(body))}`
            ),
            () => notesRichText(notes),
            notes.flatMap(({ title, body }) => [title, { marks: body }])
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
