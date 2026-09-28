/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { marksSlack, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatNode } from './schema';

export type { SlideStatNode } from './schema';

const { placeholderCaption } = slideDistillery.tokens.stat;

const valueText = ({ value, unit }: SlideStatNode): string | undefined =>
  value ? oneLine([value, unit].filter(Boolean).join(' ')) : undefined;

/** Text renderer for {@link SlideStatNode}: `value unit — body`, or a pending marker. */
export const text = (node: SlideStatNode): string =>
  `${valueText(node) ?? `[${placeholderCaption.value}]`} — ${plainText(node.body)}`;

/** Markdown renderer for {@link SlideStatNode}. */
export const markdown = (node: SlideStatNode): string => {
  const value = valueText(node);
  return `${value ? `**${markdownText(value)}**` : `_${placeholderCaption.value}_`} — ${marksMarkdown(node.body)}`;
};

/** Slack renderer for {@link SlideStatNode}: one section, the value in bold. */
export const slack = (node: SlideStatNode): SlackBlock[] => {
  const value = valueText(node);
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${value ? `*${escapeMrkdwn(value)}*` : `_${placeholderCaption.value}_`} — ${oneLine(marksSlack(node.body))}`,
      },
    },
  ];
};

/** Catalog, schema, and renderers for {@link SlideStatNode}. */
export const slideStatPrimitive = definePrimitive({
  type: 'slideStat',
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
