/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

/** Zod schema for {@link SlideTableNode}. */
export const schema = z
  .object({
    type: z.literal('slideTable'),
    columns: z
      .array(z.string().min(1))
      .min(1)
      .max(6)
      .describe('Column headings, left to right. One to six.'),
    label: z.string().describe('Optional heading above the table.').optional(),
    rowHeaders: z
      .boolean()
      .describe('Set the first cell of each row as that row’s heading.')
      .optional(),
    rows: z
      .array(z.array(z.string()))
      .min(1)
      .max(12)
      .describe('Body rows, one cell per column. One to twelve.'),
  })
  .strict()
  .refine(
    (value) => value.rows.every((row) => row.length === value.columns.length),
    {
      error: 'every row needs one cell per column',
      path: ['rows'],
    }
  );

/** Headed grid of short text cells. */
export type SlideTableNode = z.infer<typeof schema> & PrimitiveNode;
