/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownText, marksMarkdown, stripMarks } from '../../render/marks';
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

const { quoteOpen, quoteClose, separator, currentMark } =
  slideDistillery.tokens.timeline;

const when = ({ label, channel, current }: SlideTimelineItem): string =>
  `${label} ${separator.value} ${channel}${current ? ` (${currentMark.value})` : ''}`;

const quoted = ({ heading, body }: SlideTimelineItem): string =>
  `${quoteOpen.value}${heading}${quoteClose.value} ${body}`;

/** Text renderer for {@link SlideTimelineNode}: one line per item. */
export const text = ({ items }: SlideTimelineNode): string =>
  items.map((item) => `${when(item)}. ${stripMarks(quoted(item))}`).join('\n');

/** Markdown renderer for {@link SlideTimelineNode}: one bullet per item. */
export const markdown = ({ items }: SlideTimelineNode): string =>
  items
    .map(
      (item) =>
        `- **${when({ ...item, label: markdownText(item.label), channel: markdownText(item.channel) })}.** ${quoted({ ...item, heading: marksMarkdown(item.heading), body: marksMarkdown(item.body) })}`
    )
    .join('\n');

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
  },
});
