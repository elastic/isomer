/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

/** Zod schema for {@link SlideStatementNode}. */
export const schema = z
  .object({
    type: z.literal('slideStatement'),
    text: z
      .string()
      .min(1)
      // Slack's header limit, so the sentence survives intact as the message header.
      .max(150)
      .describe(
        'One sentence, the slide’s whole point, under 150 characters. Wrap the words that carry it in `**strong**`, which takes the `primary` tone. `code` and `**strong**` marks are allowed.'
      ),
    size: sizeField(),
  })
  .strict();

/** One thesis sentence set large on its own slide. */
export type SlideStatementNode = z.infer<typeof schema> & PrimitiveNode;
