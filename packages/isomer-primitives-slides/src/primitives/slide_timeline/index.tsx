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
  plainText,
  richTextRun,
} from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import {
  schema,
  type SlideTimelineItem,
  type SlideTimelineNode,
} from './schema';

export type { SlideTimelineItem, SlideTimelineNode } from './schema';

const { quoteOpen, quoteClose, separator, labelEnd } =
  slideDistillery.tokens.timeline;

const when = ({ label, channel, current }: SlideTimelineItem): string =>
  oneLine(
    `${toneCueText(current ? 'primary' : undefined)}${label} ${separator.value} ${channel.toUpperCase()}${labelEnd.value}`
  );

export const text = ({ items }: SlideTimelineNode): string =>
  items
    .map(
      (item) =>
        `${when(item)} ${quoteOpen.value}${plainText(item.heading)}${quoteClose.value} ${plainText(item.body)}`
    )
    .join('\n');

export const markdown = ({ items }: SlideTimelineNode) => [
  md.list(
    items.map((item) =>
      md.paragraph(
        md.strong(when(item)),
        ` ${quoteOpen.value}`,
        ...marksMarkdown(item.heading),
        `${quoteClose.value} `,
        ...marksMarkdown(item.body)
      )
    )
  ),
];

export const slack = ({ items }: SlideTimelineNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: items.map((item) => ({
          type: 'rich_text_section',
          elements: [
            richTextRun(when(item), { bold: true }),
            richTextRun(` ${quoteOpen.value}`),
            ...marksRichText(item.heading),
            richTextRun(`${quoteClose.value} `),
            ...marksRichText(item.body),
          ],
        })),
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideTimelineNode}. */
export const slideTimelinePrimitive = definePrimitive({
  type: 'slideTimeline',
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
