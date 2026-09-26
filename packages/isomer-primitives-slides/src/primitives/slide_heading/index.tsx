/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatHeaderText, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksSlack, stripMarks } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideHeadingNode } from './schema';

export type { SlideHeadingNode } from './schema';

/** Text renderer for {@link SlideHeadingNode}. */
export const text = ({ title, lede }: SlideHeadingNode): string =>
  [stripMarks(title).toUpperCase(), lede ? stripMarks(lede) : undefined]
    .filter(Boolean)
    .join('\n');

/** Markdown renderer for {@link SlideHeadingNode}. */
export const markdown = ({ title, lede }: SlideHeadingNode): string =>
  [`# ${title}`, lede].filter(Boolean).join('\n\n');

/** Slack renderer for {@link SlideHeadingNode}: a header, then the lede as a section. */
export const slack = ({ title, lede }: SlideHeadingNode): SlackBlock[] => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: formatHeaderText(stripMarks(title)),
      emoji: true,
    },
  },
  ...(lede
    ? [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: marksSlack(lede) },
        } satisfies SlackBlock,
      ]
    : []),
];

/** Catalog, schema, and renderers for {@link SlideHeadingNode}. */
export const slideHeadingPrimitive = definePrimitive({
  type: 'slideHeading',
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
