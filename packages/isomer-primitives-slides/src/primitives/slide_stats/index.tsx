/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { pending } from '../../render/pending';
import {
  richTextBreak,
  richTextSection,
  slackBold,
  slackFields,
  slackRichText,
} from '../../render/slack_text';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatsItem, type SlideStatsNode } from './schema';

export type { SlideStatsItem, SlideStatsNode } from './schema';

const valueText = ({ value, unit }: SlideStatsItem): string | undefined =>
  value ? oneLine([value, unit].filter(Boolean).join(' ')) : undefined;

/** `value label: body`. */
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
        ` ${oneLine(item.label)}: `,
        ...marksMarkdown(item.body)
      );
    })
  );

const itemRichText = (item: SlideStatsItem) => {
  const value = valueText(item);
  return [
    value ? richTextRun(value, { bold: true }) : pending.richText,
    richTextRun(` ${item.label}: `),
    ...marksRichText(item.body),
  ];
};

export const slack = ({ items }: SlideStatsNode): SlackBlock[] => [
  slackFields(
    items.map((item) => {
      const value = valueText(item);
      return `${value ? slackBold(value) : pending.mrkdwn} ${escapeMrkdwn(oneLine(item.label))}: ${oneLine(marksSlack(item.body))}`;
    }),
    () =>
      slackRichText(
        richTextSection(
          ...items.flatMap((item, index) => [
            ...(index > 0 ? [richTextBreak] : []),
            ...itemRichText(item),
          ])
        )
      ),
    items.flatMap((item) => [
      valueText(item) ?? '',
      item.label,
      { marks: item.body },
    ])
  ),
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
