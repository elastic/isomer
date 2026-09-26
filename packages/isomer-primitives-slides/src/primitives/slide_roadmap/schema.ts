/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const itemSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe(
        'The piece of work, in a few words. `code` and `**strong**` marks are allowed.'
      ),
    body: z
      .string()
      .min(1)
      .describe(
        'One short line on what it covers or delivers. `code` and `**strong**` marks are allowed.'
      ),
  })
  .strict();

const columnSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe('The horizon, in one or two words, e.g. "Now", "Next", "Q3".'),
    status: z
      .string()
      .min(1)
      .describe(
        'Where that work stands, set as an uppercase label, e.g. "Shipped", "In design".'
      ),
    current: z
      .boolean()
      .describe(
        'Marks the column the audience is in now, its title and status drawn in primary. At most one column. Defaults to false.'
      )
      .optional(),
    items: z
      .array(itemSchema)
      .min(1)
      .max(4)
      .describe('The work in this horizon, top to bottom. 1 to 4.'),
  })
  .strict();

/** Zod schema for {@link SlideRoadmapNode}. */
export const schema = z
  .object({
    type: z.literal('slideRoadmap'),
    columns: z
      .array(columnSchema)
      .min(2)
      .max(4)
      .describe(
        'Horizons in order, left to right, nearest first. 2 to 4. Mark the one happening now current.'
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ columns }) => columns.filter(({ current }) => current).length <= 1,
      { error: 'at most one column can be current', path: ['columns'] }
    )
  );

/** One piece of work in a {@link SlideRoadmapColumn}. */
export type SlideRoadmapItem = z.infer<typeof itemSchema>;

/** One horizon of a {@link SlideRoadmapNode}. */
export type SlideRoadmapColumn = z.infer<typeof columnSchema>;

/** Planned work in ruled columns by horizon, with at most one current. */
export type SlideRoadmapNode = z.infer<typeof schema> & PrimitiveNode;
