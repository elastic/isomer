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
    label ?? '',
    ...turns.map(({ role, text: said }) =>
      said.includes('\n')
        ? `${roleLabel[role].value}:\n${said}`
        : `${roleLabel[role].value}: ${said}`
    ),
  ]
    .filter(Boolean)
    .join('\n');

const fenceFor = (code: string): string =>
  '`'.repeat(
    Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length)) + 1
  );

/** Markdown renderer for {@link SlideTranscriptNode}. */
export const markdown = ({ label, turns }: SlideTranscriptNode): string =>
  [
    label ? `## ${label}` : '',
    ...turns.map(({ format, role, text: said }) => {
      const speaker = `**${roleLabel[role].value}**`;
      if (format === 'code') {
        const fence = fenceFor(said);
        return `${speaker}\n\n${fence}text\n${said}\n${fence}`;
      }
      return `${speaker}\n\n${said}`;
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
        format === 'code' ? codeBlock(said) : escapeMrkdwn(said)
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
