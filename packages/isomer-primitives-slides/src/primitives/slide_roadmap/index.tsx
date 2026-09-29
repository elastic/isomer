/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
  strongMarksMarkdown,
  strongMarksRichText,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
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
  oneLine(
    `${title} ${separator.value} ${status}${current ? ` (${currentMark.value})` : ''}`
  );

export const text = ({ columns }: SlideRoadmapNode): string =>
  columns
    .map((column) =>
      [
        horizon(column, column.title.toUpperCase()),
        ...column.items.map(
          ({ title, body }) => `- ${plainText(title)}: ${plainText(body)}`
        ),
      ].join('\n')
    )
    .join('\n\n');

export const markdown = ({ columns }: SlideRoadmapNode) =>
  columns.flatMap((column) => [
    md.heading(2, horizon(column, column.title)),
    md.list(
      column.items.map(({ title, body }) =>
        md.paragraph(strongMarksMarkdown(title), ': ', ...marksMarkdown(body))
      )
    ),
  ]);

export const slack = ({ columns }: SlideRoadmapNode): SlackBlock[] =>
  columns.map((column) => ({
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [richTextRun(horizon(column, column.title), { bold: true })],
      },
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: column.items.map(({ title, body }) => ({
          type: 'rich_text_section',
          elements: [
            ...strongMarksRichText(title),
            richTextRun(': '),
            ...marksRichText(body),
          ],
        })),
      },
    ],
  }));

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
    slack,
  },
});
