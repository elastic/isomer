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

const statSchema = z
  .object({
    value: z
      .string()
      .min(1)
      .describe(
        'The number as it should read, e.g. `13` or `2.4`. Keep it to about four characters. Omit it when the number is not known yet: the column shows a placeholder, never an invented value.'
      )
      .optional(),
    unit: z
      .string()
      .min(1)
      .describe(
        'Short unit set smaller after the value, e.g. `KB` or `ms`. Requires `value`.'
      )
      .optional(),
    label: z
      .string()
      .min(1)
      .describe('What is counted, in one to three words, e.g. `Regions`.'),
    body: z
      .string()
      .min(1)
      .describe(
        'One sentence of context: how it was measured or why it matters. `code` and `**strong**` marks are allowed.'
      ),
  })
  .strict()
  .check(
    crossRefine(
      ({ value, unit }) => unit === undefined || value !== undefined,
      {
        error: 'unit needs a value',
        path: ['unit'],
      }
    )
  );

/** One number in a {@link SlideStatsNode}. */
export type SlideStatsItem = z.infer<typeof statSchema>;

/** Zod schema for {@link SlideStatsNode}. */
export const schema = z
  .object({
    type: z.literal('slideStats'),
    items: z
      .array(statSchema)
      .min(2)
      .max(4)
      .describe('Numbers to compare, left to right, in equal columns. 2 to 4.'),
    size: sizeField(),
  })
  .strict();

/** Two to four comparable numbers in ruled columns. */
export type SlideStatsNode = z.infer<typeof schema> & PrimitiveNode;
