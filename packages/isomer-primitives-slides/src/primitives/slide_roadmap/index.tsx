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
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';
import { styledText } from '../size';

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

const { separator } = slideDistillery.tokens.roadmap;
const { label } = slideDistillery.tokens;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

const horizon = ({ title, status, current }: SlideRoadmapColumn): string =>
  oneLine(
    `${toneCueText(current ? 'primary' : undefined)}${title} ${separator.value} ${styledText(status, label)}`
  );

export const text = ({ columns }: SlideRoadmapNode): string =>
  columns
    .map((column) =>
      [
        horizon(column),
        ...column.items.map(
          ({ title, body }) =>
            `- ${plainText(title)}${termJoiner}${plainText(body)}`
        ),
      ].join('\n')
    )
    .join('\n\n');

export const markdown = ({ columns }: SlideRoadmapNode) =>
  columns.flatMap((column) => [
    md.heading(2, horizon(column)),
    md.list(
      column.items.map(({ title, body }) =>
        md.paragraph(
          strongMarksMarkdown(title),
          termJoiner,
          ...marksMarkdown(body)
        )
      )
    ),
  ]);

export const slack = ({ columns }: SlideRoadmapNode): SlackBlock[] =>
  columns.map((column) => ({
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [richTextRun(horizon(column), { bold: true })],
      },
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: column.items.map(({ title, body }) => ({
          type: 'rich_text_section',
          elements: [
            ...strongMarksRichText(title),
            richTextRun(termJoiner),
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
