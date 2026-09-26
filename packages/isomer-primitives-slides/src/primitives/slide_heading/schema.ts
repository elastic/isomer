/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

/** Zod schema for {@link SlideHeadingNode}. */
export const schema = z
  .object({
    type: z.literal('slideHeading'),
    title: z
      .string()
      .min(1)
      .describe(
        'The slide’s claim, as a sentence. Aim for one line; two at most. `code` and `**strong**` marks are allowed; strong takes the `primary` tone.'
      ),
    lede: z
      .string()
      .min(1)
      .describe(
        'One or two sentences that support the title. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();

/** A content slide’s title and optional lede, at a fixed position. */
export type SlideHeadingNode = z.infer<typeof schema> & PrimitiveNode;
