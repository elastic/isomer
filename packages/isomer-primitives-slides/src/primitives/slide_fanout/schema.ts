/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';
import { slideToneSchema } from '../tone_schema';

const targetSchema = z
  .object({
    name: lineText().describe(
      'Short identifier for the target, set in mono, e.g. `email`. One or two words.'
    ),
    body: wrappedText().describe(
      'What the target does with the source, in one short line: under about 30 characters beside a title, where the column is narrow.'
    ),
    tone: slideToneSchema
      .describe(
        'The tone of this target: `primary` for your own product, `accent` for the host or another party. Leave it out for a neutral target.'
      )
      .optional(),
  })
  .strict();

export type SlideFanoutTarget = z.infer<typeof targetSchema>;

/** Zod schema for {@link SlideFanoutNode}. */
export const schema = z
  .object({
    type: z.literal('slideFanout'),
    source: lineText().describe(
      'The one thing every target receives, set in mono, e.g. `OrderPlaced`. One or two words.'
    ),
    targets: z
      .array(targetSchema)
      .min(2)
      .max(6)
      .describe(
        'Where the source goes, top to bottom. Unordered: none runs before another. 2–6 targets.'
      ),
  })
  .strict();

/** One source branching to several unordered targets. */
export type SlideFanoutNode = z.infer<typeof schema> & PrimitiveNode;
