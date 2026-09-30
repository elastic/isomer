/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { richTextBreak, slackRichText, slackSection } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { contextJoiner } from './attribution';
import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideQuoteNode } from './schema';

export type { SlideQuoteNode } from './schema';

const { quoteOpen, quoteClose, dash } = slideDistillery.tokens.quote;

const attribution = ({ source, context }: SlideQuoteNode): string =>
  oneLine(
    `${dash.value} ${[source, context].filter(Boolean).join(contextJoiner)}`
  );

export const text = (node: SlideQuoteNode): string =>
  `${quoteOpen.value}${plainText(node.text)}${quoteClose.value} ${attribution(node)}`;

export const markdown = (node: SlideQuoteNode) =>
  md.blockquote(
    md.paragraph(
      quoteOpen.value,
      ...marksMarkdown(node.text),
      quoteClose.value
    ),
    md.paragraph(attribution(node))
  );

export const slack = (node: SlideQuoteNode): SlackBlock[] => [
  slackSection(
    `> ${quoteOpen.value}${oneLine(marksSlack(node.text))}${quoteClose.value}\n> ${escapeMrkdwn(attribution(node))}`,
    () =>
      slackRichText({
        type: 'rich_text_quote',
        elements: [
          richTextRun(quoteOpen.value),
          ...marksRichText(node.text),
          richTextRun(quoteClose.value),
          richTextBreak,
          richTextRun(attribution(node)),
        ],
      })
  ),
];

/** Catalog, schema, and renderers for {@link SlideQuoteNode}. */
export const slideQuotePrimitive = definePrimitive({
  type: 'slideQuote',
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
