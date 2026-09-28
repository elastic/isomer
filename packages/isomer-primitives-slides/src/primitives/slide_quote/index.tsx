/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  markdownText,
  marksMarkdown,
  marksSlack,
  plainText,
} from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideQuoteNode } from './schema';

export type { SlideQuoteNode } from './schema';

const { quoteOpen, quoteClose, dash } = slideDistillery.tokens.quote;

const quoted = (text: string): string =>
  `${quoteOpen.value}${text}${quoteClose.value}`;

const attribution = ({ source, context }: SlideQuoteNode): string =>
  `${dash.value} ${[source, context].filter(Boolean).join(', ')}`;

/** Text renderer for {@link SlideQuoteNode}: the quote, then its attribution. */
export const text = (node: SlideQuoteNode): string =>
  `${quoted(plainText(node.text))} ${oneLine(attribution(node))}`;

/** Markdown renderer for {@link SlideQuoteNode}: a blockquote with the attribution as its last line. */
export const markdown = (node: SlideQuoteNode): string => {
  const { text: said, source, context } = node;
  const cited = attribution({
    ...node,
    source: markdownText(source),
    ...(context ? { context: markdownText(context) } : {}),
  });
  return `> ${quoted(marksMarkdown(said))}\n>\n> ${cited}`;
};

/** Slack renderer for {@link SlideQuoteNode}: a quoted section. */
export const slack = (node: SlideQuoteNode): SlackBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `> ${quoted(oneLine(marksSlack(node.text)))}\n> ${escapeMrkdwn(oneLine(attribution(node)))}`,
    },
  },
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
