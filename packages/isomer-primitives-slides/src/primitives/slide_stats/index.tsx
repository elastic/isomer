/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown, marksSlack, plainText } from '../../render/marks';
import { pending } from '../../render/pending';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatsItem, type SlideStatsNode } from './schema';

export type { SlideStatsItem, SlideStatsNode } from './schema';

const valueText = ({ value, unit }: SlideStatsItem): string | undefined =>
  value ? oneLine([value, unit].filter(Boolean).join(' ')) : undefined;

export const text = ({ items }: SlideStatsNode): string =>
  items
    .map(
      (item) =>
        `${valueText(item) ?? pending.text} ${oneLine(item.label)}: ${plainText(item.body)}`
    )
    .join('\n');

export const markdown = ({ items }: SlideStatsNode) =>
  md.list(
    items.map((item) => {
      const value = valueText(item);
      return md.paragraph(
        value ? md.strong(value) : pending.markdown,
        ` ${item.label}: `,
        ...marksMarkdown(item.body)
      );
    })
  );

export const slack = ({ items }: SlideStatsNode): SlackBlock[] => [
  {
    type: 'section',
    fields: items.map((item) => {
      const value = valueText(item);
      return {
        type: 'mrkdwn',
        text: [
          value ? bold(value) : pending.mrkdwn,
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
