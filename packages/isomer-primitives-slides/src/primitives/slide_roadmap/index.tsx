/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import {
  schema,
  type SlideRoadmapColumn,
  type SlideRoadmapNode,
} from './schema';

export type {
  SlideRoadmapColumn,
  SlideRoadmapItem,
  SlideRoadmapNode,
} from './schema';

const { separator, currentMark } = slideDistillery.tokens.roadmap;

const horizon = (
  { status, current }: SlideRoadmapColumn,
  title: string
): string =>
  `${title} ${separator.value} ${status}${current ? ` (${currentMark.value})` : ''}`;

/** Text renderer for {@link SlideRoadmapNode}: each horizon, then its items. */
export const text = ({ columns }: SlideRoadmapNode): string =>
  columns
    .map((column) =>
      [
        oneLine(horizon(column, column.title.toUpperCase())),
        ...column.items.map(
          ({ title, body }) => `- ${plainText(title)}: ${plainText(body)}`
        ),
      ].join('\n')
    )
    .join('\n\n');

/** Markdown renderer for {@link SlideRoadmapNode}: a heading per horizon over its items. */
export const markdown = ({ columns }: SlideRoadmapNode): string =>
  columns
    .map((column) =>
      [
        `## ${horizon({ ...column, status: markdownText(column.status) }, markdownText(column.title))}`,
        column.items
          .map(
            ({ title, body }) =>
              `- **${marksMarkdown(title)}**: ${marksMarkdown(body)}`
          )
          .join('\n'),
      ].join('\n\n')
    )
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideRoadmapNode}. */
export const slideRoadmapPrimitive = definePrimitive({
  type: 'slideRoadmap',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
