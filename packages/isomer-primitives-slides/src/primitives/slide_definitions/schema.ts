/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { definitionsSingleColumnMax } from '../../theme/components/definitions';
import { lineText, wrappedText } from '../authored_text';
import { sizeField } from '../size';

const definitionSchema = z
  .object({
    term: lineText().describe(
      'The word or identifier being defined, set in monospace. Keep it to a few words.'
    ),
    body: wrappedText().describe(
      'What the term means, in one sentence. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

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
        `Terms in the order a reader should learn them. 1 to 6; ${definitionsSingleColumnMax + 1} or more lay out in two columns.`
      ),
    size: sizeField(),
  })
  .strict();

/** Terms and their meanings as a ruled glossary. */
export type SlideDefinitionsNode = z.infer<typeof schema> & PrimitiveNode;
