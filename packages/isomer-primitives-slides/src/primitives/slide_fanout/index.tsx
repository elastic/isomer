/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { richTextSection, slackRichText } from '../../render';
import { richTextRun } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideFanoutNode } from './schema';

export type { SlideFanoutNode, SlideFanoutTarget } from './schema';

const { arrow } = slideDistillery.tokens.fanout;

export const text = ({ source, targets }: SlideFanoutNode): string =>
  [
    `${oneLine(source)} ${arrow.value}`,
    ...targets.map(({ name, body }) => `  ${oneLine(name)}: ${oneLine(body)}`),
  ].join('\n');

export const markdown = ({ source, targets }: SlideFanoutNode) => [
  md.paragraph(md.strong(source), ` ${arrow.value}`),
  md.list(
    targets.map(({ name, body }) => md.paragraph(md.strong(name), ': ', body))
  ),
];

export const slack = ({ source, targets }: SlideFanoutNode): SlackBlock[] => [
  slackRichText(
    richTextSection(
      richTextRun(source, { bold: true }),
      richTextRun(` ${arrow.value}`)
    ),
    {
      type: 'rich_text_list',
      style: 'bullet',
      elements: targets.map(({ name, body }) =>
        richTextSection(
          richTextRun(name, { bold: true }),
          richTextRun(': '),
          richTextRun(body)
        )
      ),
    }
  ),
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
