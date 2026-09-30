/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import {
  richTextSection,
  slackBold,
  slackCaption,
  slackRichText,
  slackSection,
} from '../../render';
import { richTextRun } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { turnLines } from './lines';
import { react } from './react';
import {
  schema,
  type SlideTranscriptNode,
  type SlideTranscriptTurn,
} from './schema';

export type { SlideTranscriptNode, SlideTranscriptTurn } from './schema';

const { glyph, transcript } = slideDistillery.tokens;

const speaker = (role: SlideTranscriptTurn['role']): string =>
  transcript.roleLabel[role].value.toUpperCase();

export const text = ({ label, turns }: SlideTranscriptNode): string =>
  [
    label && oneLine(label).toUpperCase(),
    ...turns.map(
      ({ role, text: said }) =>
        `${speaker(role)}${glyph.termJoiner.value}${turnLines(said).join('\n')}`
    ),
  ]
    .filter(Boolean)
    .join('\n');

export const markdown = ({ label, turns }: SlideTranscriptNode) => [
  ...(label ? [md.paragraph(md.strong(label.toUpperCase()))] : []),
  ...turns.flatMap(({ format, role, text: said }) => [
    md.paragraph(md.strong(speaker(role))),
    format === 'code'
      ? md.codeBlock(turnLines(said).join('\n'), 'text')
      : md.paragraph(
          ...turnLines(said).flatMap((line, row) =>
            row > 0 ? [md.break(), line] : [line]
          )
        ),
  ]),
];

export const slack = ({ label, turns }: SlideTranscriptNode): SlackBlock[] => [
  ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
  ...turns.map(({ format, role, text: said }): SlackBlock => {
    const lines = turnLines(said).join('\n');
    const body = { type: 'text', text: lines } as const;
    return slackSection(
      `${slackBold(speaker(role))}\n${
        format === 'code' ? codeBlock(lines) : escapeMrkdwn(lines)
      }`,
      () =>
        slackRichText(
          richTextSection(richTextRun(speaker(role), { bold: true })),
          format === 'code'
            ? { type: 'rich_text_preformatted', elements: [body] }
            : richTextSection(body)
        )
    );
  }),
];

/** Catalog, schema, and renderers for {@link SlideTranscriptNode}. */
export const slideTranscriptPrimitive = definePrimitive({
  type: 'slideTranscript',
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
