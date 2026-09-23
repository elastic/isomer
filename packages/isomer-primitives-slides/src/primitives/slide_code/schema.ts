/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';

/** Zod schema for {@link SlideCodeNode}. */
export const schema = z
  .object({
    type: z.literal('slideCode'),
    code: fromTextChildren(z.string().min(1).describe('Source to display.'), {
      collapseWhitespace: false,
    }),
    highlight: z
      .array(z.number().int().positive())
      .describe('1-based line numbers to emphasize. Other lines dim.')
      .optional(),
    label: z.string().describe('Optional heading above the block.').optional(),
    language: z.string().describe('Used for the markdown fence.').optional(),
  })
  .strict()
  .refine(
    ({ code, highlight }) =>
      highlight === undefined ||
      highlight.every((line) => line <= code.split('\n').length),
    {
      error: 'highlight lines must exist in code',
      path: ['highlight'],
    }
  );

/** Labeled code block with an optional language hint. */
export type SlideCodeNode = z.infer<typeof schema> & PrimitiveNode;
