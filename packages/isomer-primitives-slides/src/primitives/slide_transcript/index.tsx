/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bold,
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { fencedBlock } from '../../render/fence';
import { LINE_TERMINATORS, markdownText, singleLine } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTranscriptNode } from './schema';

export type { SlideTranscriptNode, SlideTranscriptTurn } from './schema';

const { roleLabel } = slideDistillery.tokens.transcript;

/** Text renderer for {@link SlideTranscriptNode}. */
export const text = ({ label, turns }: SlideTranscriptNode): string =>
  [
    label ? singleLine(label) : '',
    ...turns.map(({ role, text: said }) => {
      const lines = said.split(LINE_TERMINATORS);
      return lines.length > 1
        ? `${roleLabel[role].value}:\n${lines.join('\n')}`
        : `${roleLabel[role].value}: ${said}`;
    }),
  ]
    .filter(Boolean)
    .join('\n');

/** Markdown renderer for {@link SlideTranscriptNode}. */
export const markdown = ({ label, turns }: SlideTranscriptNode): string =>
  [
    label ? `## ${markdownText(label)}` : '',
    ...turns.map(({ format, role, text: said }) => {
      const speaker = `**${roleLabel[role].value}**`;
      if (format === 'code') {
        return `${speaker}\n\n${fencedBlock(said, 'text')}`;
      }
      return `${speaker}\n\n${said
        .split(LINE_TERMINATORS)
        .map(markdownText)
        .join('\n')}`;
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Slack renderer for {@link SlideTranscriptNode}: one section per turn, speaker first. */
export const slack = ({ label, turns }: SlideTranscriptNode): SlackBlock[] => [
  ...(label ? [slackCaption(label, true)] : []),
  ...turns.map(({ format, role, text: said }): SlackBlock => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${bold(roleLabel[role].value)}\n${
        format === 'code'
          ? codeBlock(said)
          : escapeMrkdwn(said.split(LINE_TERMINATORS).join('\n'))
      }`,
    },
  })),
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
