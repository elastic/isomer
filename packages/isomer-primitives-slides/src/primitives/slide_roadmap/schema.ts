/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const itemSchema = z
  .object({
    title: lineText().describe(
      'The piece of work, in a few words. `code` and `**strong**` marks are allowed.'
    ),
    body: wrappedText().describe(
      'One short line on what it covers or delivers. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

const columnSchema = z
  .object({
    title: lineText().describe(
      'The horizon, in one or two words, e.g. "Now", "Next", "Q3".'
    ),
    status: lineText().describe(
      'Where that work stands, set as an uppercase label, e.g. "Shipped", "In design".'
    ),
    current: z
      .boolean()
      .describe(
        'Marks the column the audience is in now: a bar above it and a dot before its status, in primary. At most one column. Defaults to false.'
      )
      .optional(),
    items: z
      .array(itemSchema)
      .min(1)
      .max(4)
      .describe('The work in this horizon, top to bottom. 1 to 4.'),
  })
  .strict();

const maxColumns = 4;

export type SlideRoadmapItem = z.infer<typeof itemSchema>;

export type SlideRoadmapColumn = z.infer<typeof columnSchema>;

/** Zod schema for {@link SlideRoadmapNode}. */
export const schema = z
  .object({
    type: z.literal('slideRoadmap'),
    columns: z
      .array(columnSchema)
      .min(2)
      .max(maxColumns)
      .describe(
        'Horizons in order, left to right, nearest first. 2 to 4. Mark the one happening now current.'
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ columns }) =>
        columns.length > maxColumns ||
        columns.filter(({ current }) => current).length <= 1,
      { error: 'at most one column can be current', path: ['columns'] }
    )
  );

/** Planned work in ruled columns by horizon, at most one current. */
export type SlideRoadmapNode = z.infer<typeof schema> & PrimitiveNode;
