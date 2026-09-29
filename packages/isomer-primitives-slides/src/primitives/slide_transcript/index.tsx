/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  bold,
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { splitLines } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTranscriptNode } from './schema';

export type { SlideTranscriptNode, SlideTranscriptTurn } from './schema';

const { roleLabel } = slideDistillery.tokens.transcript;

export const text = ({ label, turns }: SlideTranscriptNode): string =>
  [
    label && oneLine(label).toUpperCase(),
    ...turns.map(({ role, text: said }) => {
      const lines = splitLines(said);
      return lines.length > 1
        ? `${roleLabel[role].value}:\n${lines.join('\n')}`
        : `${roleLabel[role].value}: ${said}`;
    }),
  ]
    .filter(Boolean)
    .join('\n');

export const markdown = ({ label, turns }: SlideTranscriptNode) => [
  ...(label ? [md.paragraph(md.strong(label.toUpperCase()))] : []),
  ...turns.flatMap(({ format, role, text: said }) => [
    md.paragraph(md.strong(roleLabel[role].value)),
    format === 'code'
      ? md.codeBlock(splitLines(said).join('\n'), 'text')
      : md.paragraph(
          ...splitLines(said).flatMap((line, row) =>
            row > 0 ? [md.break(), line] : [line]
          )
        ),
  ]),
];

export const slack = ({ label, turns }: SlideTranscriptNode): SlackBlock[] => [
  ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
  ...turns.map(({ format, role, text: said }): SlackBlock => {
    const lines = splitLines(said).join('\n');
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${bold(roleLabel[role].value)}\n${
          format === 'code' ? codeBlock(lines) : escapeMrkdwn(lines)
        }`,
      },
    };
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
