/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { bold, italic, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { marksSlack, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatsItem, type SlideStatsNode } from './schema';

export type { SlideStatsItem, SlideStatsNode } from './schema';

const { placeholderCaption } = slideDistillery.tokens.stats;

const valueText = ({ value, unit }: SlideStatsItem): string | undefined =>
  value ? oneLine([value, unit].filter(Boolean).join(' ')) : undefined;

/** Text renderer for {@link SlideStatsNode}: `value Label: body` per line. */
export const text = ({ items }: SlideStatsNode): string =>
  items
    .map(
      (item) =>
        `${valueText(item) ?? `[${placeholderCaption.value}]`} ${oneLine(item.label)}: ${plainText(item.body)}`
    )
    .join('\n');

/** Markdown renderer for {@link SlideStatsNode}: `- **value** Label: body`. */
export const markdown = ({ items }: SlideStatsNode): string =>
  items
    .map((item) => {
      const value = valueText(item);
      return `- ${value ? `**${markdownText(value)}**` : `_${placeholderCaption.value}_`} ${markdownText(item.label)}: ${marksMarkdown(item.body)}`;
    })
    .join('\n');

/** Slack renderer for {@link SlideStatsNode}: one section field per number. */
export const slack = ({ items }: SlideStatsNode): SlackBlock[] => [
  {
    type: 'section',
    fields: items.map((item) => {
      const value = valueText(item);
      return {
        type: 'mrkdwn',
        text: [
          value ? bold(value) : italic(placeholderCaption.value),
          bold(oneLine(item.label)),
          oneLine(marksSlack(item.body)),
        ].join('\n'),
      };
    }),
  },
];

/** Catalog, schema, and renderers for {@link SlideStatsNode}. */
export const slideStatsPrimitive = definePrimitive({
  type: 'slideStats',
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
