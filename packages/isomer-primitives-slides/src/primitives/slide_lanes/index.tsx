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
import { schema, type SlideLanesNode } from './schema';

export type { SlideLanesLane, SlideLanesNode, SlideLanesNote } from './schema';

const { arrow } = slideDistillery.tokens.lanes;

const path = (steps: string[], join: string): string =>
  [...steps, join].join(` ${arrow.value} `);

/** Text renderer for {@link SlideLanesNode}: one line per lane, then the notes. */
export const text = ({ lanes, join, notes = [] }: SlideLanesNode): string =>
  [
    lanes
      .map(({ label, steps }) => `${label}: ${path(steps, join)}`)
      .join('\n'),
    ...(notes.length > 0
      ? [
          notes
            .map(({ title, body }) => `${title}: ${stripMarks(body)}`)
            .join('\n'),
        ]
      : []),
  ].join('\n\n');

/** Markdown renderer for {@link SlideLanesNode}: a bullet per lane, then the notes. */
export const markdown = ({ lanes, join, notes = [] }: SlideLanesNode): string =>
  [
    lanes
      .map(
        ({ label, steps }) =>
          `- **${markdownText(label)}:** ${path(steps.map(markdownText), markdownText(join))}`
      )
      .join('\n'),
    ...(notes.length > 0
      ? [
          notes
            .map(
              ({ title, body }) =>
                `**${markdownText(title)}:** ${marksMarkdown(body)}`
            )
            .join('\n\n'),
        ]
      : []),
  ].join('\n\n');

/** Catalog, schema, and renderers for {@link SlideLanesNode}. */
export const slideLanesPrimitive = definePrimitive({
  type: 'slideLanes',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
