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
    label: z
      .string()
      .min(1)
      .describe(
        'The point in time, set large above the rail, e.g. a year or "Q3". Keep it to a few characters.'
      ),
    channel: z
      .string()
      .min(1)
      .describe(
        'A one- or two-word category for the item, set as an uppercase label under the dot, e.g. "Mobile".'
      ),
    heading: z
      .string()
      .min(1)
      .describe(
        'What was asked for or said at that point, as a short sentence. Author it without quotes; the slide adds them. `code` and `**strong**` marks are allowed.'
      ),
    body: z
      .string()
      .min(1)
      .describe(
        'One sentence on what happened as a result. `code` and `**strong**` marks are allowed.'
      ),
    current: z
      .boolean()
      .describe(
        'Marks the item the story has arrived at, drawn in primary. At most one item. Defaults to false.'
      )
      .optional(),
  })
  .strict();

/** Zod schema for {@link SlideTimelineNode}. */
export const schema = z
  .object({
    type: z.literal('slideTimeline'),
    items: z
      .array(itemSchema)
      .min(3)
      .max(5)
      .describe(
        '3–5 points in chronological order, left to right. Mark the latest or most relevant one current.'
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ items }) => items.filter(({ current }) => current).length <= 1,
      {
        error: 'at most one item can be current',
        path: ['items'],
      }
    )
  );

/** One point on a {@link SlideTimelineNode}. */
export type SlideTimelineItem = z.infer<typeof itemSchema>;

/** Dated points on a rail, read left to right, with at most one current. */
export type SlideTimelineNode = z.infer<typeof schema> & PrimitiveNode;
