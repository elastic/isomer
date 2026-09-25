/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bold,
  escapeMrkdwn,
  italic,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatsItem, type SlideStatsNode } from './schema';

export type { SlideStatsItem, SlideStatsNode } from './schema';

const { placeholderCaption } = slideDistillery.tokens.stats;

const valueText = ({ value, unit }: SlideStatsItem): string | undefined =>
  value ? [value, unit].filter(Boolean).join(' ') : undefined;

/** Text renderer for {@link SlideStatsNode}: `value Label: body` per line. */
export const text = ({ items }: SlideStatsNode): string =>
  items
    .map(
      (item) =>
        `${valueText(item) ?? `[${placeholderCaption.value}]`} ${item.label}: ${item.body}`
    )
    .join('\n');

/** Markdown renderer for {@link SlideStatsNode}: `- **value** Label: body`. */
export const markdown = ({ items }: SlideStatsNode): string =>
  items
    .map((item) => {
      const value = valueText(item);
      return `- ${value ? `**${value}**` : `_${placeholderCaption.value}_`} ${item.label}: ${item.body}`;
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
          bold(item.label),
          escapeMrkdwn(item.body),
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
