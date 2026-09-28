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

const pointSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe(
        'When or where the number was taken, in one to three words, e.g. `Last spring`. `code` and `**strong**` marks are allowed.'
      ),
    value: z
      .string()
      .min(1)
      .describe(
        'The number as it should read, unit included, e.g. `26` or `4.2s`. Keep it to about four characters. Omit it when the number is not known yet: the slide shows a placeholder, never an invented value.'
      )
      .optional(),
  })
  .strict();

/** One side of a {@link SlideDeltaNode}. */
export type SlideDeltaPoint = z.infer<typeof pointSchema>;

/** Zod schema for {@link SlideDeltaNode}. */
export const schema = z
  .object({
    type: z.literal('slideDelta'),
    before: pointSchema.describe('The starting number, on the left.'),
    after: pointSchema.describe('The number now, on the right, in primary.'),
    change: z
      .string()
      .min(1)
      .describe(
        'The difference as it should read, e.g. `+13` or `−40%`. Leave it out when either value is missing.'
      )
      .optional(),
    body: z
      .string()
      .min(1)
      .describe(
        'One sentence on what changed and why it matters. `code` and `**strong**` marks are allowed.'
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ before, after, change }) =>
        change === undefined ||
        (before.value !== undefined && after.value !== undefined),
      { error: 'change needs both values', path: ['change'] }
    )
  );

/** One number before and after a change, with what the change means. */
export type SlideDeltaNode = z.infer<typeof schema> & PrimitiveNode;
