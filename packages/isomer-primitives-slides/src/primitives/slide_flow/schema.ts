/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

/** Zod schema for {@link SlideFlowNode}. */
export const schema = z
  .object({
    type: z.literal('slideFlow'),
    boundaryAfter: z
      .number()
      .int()
      .positive()
      .describe(
        '1-based index after which connecting lines use the primary accent.'
      )
      .optional(),
    label: z
      .string()
      .describe('Optional heading above the sequence.')
      .optional(),
    nodes: z
      .array(z.string().min(1))
      .min(2)
      .describe('Box labels, left to right. At least two.'),
  })
  .strict()
  .refine(
    (value) =>
      value.boundaryAfter === undefined ||
      value.boundaryAfter <= value.nodes.length - 1,
    {
      error: 'boundaryAfter must be less than nodes.length',
      path: ['boundaryAfter'],
    }
  );

/** Horizontal sequence of labeled boxes connected by lines. */
export type SlideFlowNode = z.infer<typeof schema> & PrimitiveNode;
