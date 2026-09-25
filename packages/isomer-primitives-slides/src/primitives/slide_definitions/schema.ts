/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

const definitionSchema = z
  .object({
    term: z
      .string()
      .min(1)
      .describe(
        'The word or identifier being defined, set in monospace. Keep it to a few words.'
      ),
    body: z.string().min(1).describe('What the term means, in one sentence.'),
  })
  .strict();

/** One term and its meaning in a {@link SlideDefinitionsNode}. */
export type SlideDefinition = z.infer<typeof definitionSchema>;

/** Zod schema for {@link SlideDefinitionsNode}. */
export const schema = z
  .object({
    type: z.literal('slideDefinitions'),
    items: z
      .array(definitionSchema)
      .min(1)
      .max(6)
      .describe(
        'Terms in the order a reader should learn them. 1 to 6; five or six lay out in two columns.'
      ),
    size: sizeField(),
  })
  .strict();

/** Terms and their meanings as a ruled glossary. */
export type SlideDefinitionsNode = z.infer<typeof schema> & PrimitiveNode;
