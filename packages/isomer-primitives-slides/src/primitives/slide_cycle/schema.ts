/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

/** Zod schema for {@link SlideCycleNode}. */
export const schema = z
  .object({
    type: z.literal('slideCycle'),
    center: z
      .string()
      .describe('Optional short text inside the ring, naming the loop.')
      .optional(),
    label: z.string().describe('Optional heading above the ring.').optional(),
    nodes: z
      .array(z.string().min(1))
      .min(3)
      .max(6)
      .describe(
        'Step labels, clockwise from the top. The last step returns to the first. Three to six.'
      ),
  })
  .strict();

/** A closed loop of steps drawn clockwise around a ring. */
export type SlideCycleNode = z.infer<typeof schema> & PrimitiveNode;
