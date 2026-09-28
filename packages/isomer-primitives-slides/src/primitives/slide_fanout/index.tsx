/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bold, escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { markdownText, singleLine } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideFanoutNode } from './schema';

export type { SlideFanoutNode, SlideFanoutTarget } from './schema';

const { arrow } = slideDistillery.tokens.fanout;

/** Text renderer for {@link SlideFanoutNode}. */
export const text = ({ source, targets }: SlideFanoutNode): string =>
  [
    `${singleLine(source)} ${arrow.value}`,
    ...targets.map(
      ({ name, body }) => `  ${singleLine(name)}: ${singleLine(body)}`
    ),
  ].join('\n');

/** Markdown renderer for {@link SlideFanoutNode}. */
export const markdown = ({ source, targets }: SlideFanoutNode): string =>
  [
    `**${markdownText(source)}** ${arrow.value}`,
    targets
      .map(({ name, body }) => `- ${markdownText(name)}: ${markdownText(body)}`)
      .join('\n'),
  ].join('\n\n');

/** Slack renderer for {@link SlideFanoutNode}: the source, then one bullet per target. */
export const slack = ({ source, targets }: SlideFanoutNode): SlackBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: [
        `${bold(singleLine(source))} ${arrow.value}`,
        ...targets.map(
          ({ name, body }) =>
            `• ${bold(singleLine(name))}: ${escapeMrkdwn(singleLine(body))}`
        ),
      ].join('\n'),
    },
  },
];

/** Catalog, schema, and renderers for {@link SlideFanoutNode}. */
export const slideFanoutPrimitive = definePrimitive({
  type: 'slideFanout',
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
