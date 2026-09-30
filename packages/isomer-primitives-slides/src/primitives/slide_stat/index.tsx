/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import { pending } from '../../render/pending';
import {
  richTextSection,
  slackBold,
  slackRichText,
  slackSection,
} from '../../render/slack_text';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatNode } from './schema';

export type { SlideStatNode } from './schema';

const dash = ` ${slideDistillery.tokens.stat.dash.value} `;

const valueText = ({ value, unit }: SlideStatNode): string | undefined =>
  value ? oneLine([value, unit].filter(Boolean).join(' ')) : undefined;

export const text = (node: SlideStatNode): string =>
  `${valueText(node) ?? pending.text}${dash}${plainText(node.body)}`;

export const markdown = (node: SlideStatNode) => {
  const value = valueText(node);
  return md.paragraph(
    value ? md.strong(value) : pending.markdown,
    dash,
    ...marksMarkdown(node.body)
  );
};

export const slack = (node: SlideStatNode): SlackBlock[] => {
  const value = valueText(node);
  return [
    slackSection(
      `${value ? slackBold(value) : pending.mrkdwn}${dash}${oneLine(marksSlack(node.body))}`,
      () =>
        slackRichText(
          richTextSection(
            value ? richTextRun(value, { bold: true }) : pending.richText,
            richTextRun(dash),
            ...marksRichText(node.body)
          )
        )
    ),
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
