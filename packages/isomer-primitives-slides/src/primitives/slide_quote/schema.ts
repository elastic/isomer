/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

/** Zod schema for {@link SlideQuoteNode}. */
export const schema = z
  .object({
    type: z.literal('slideQuote'),
    text: z
      .string()
      .min(1)
      .describe(
        'The quoted words, one or two sentences. Author them without quotation marks; the slide adds them. `code` and `**strong**` marks are allowed; strong takes the `primary` tone.'
      ),
    source: z
      .string()
      .min(1)
      .describe('Who said or wrote it: a person, a document, or a team.'),
    context: z
      .string()
      .min(1)
      .describe('Where or when, e.g. a role, a meeting, or a date.')
      .optional(),
    size: sizeField(),
  })
  .strict();

/** A quotation set large, with its source beneath. */
export type SlideQuoteNode = z.infer<typeof schema> & PrimitiveNode;
