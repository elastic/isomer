/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { lineText, wrappedText } from '../authored_text';
import { slideToneSchema } from '../tone_schema';

const territorySchema = z
  .object({
    body: wrappedText().describe(
      'What this owner is responsible for, in one or two sentences. `code` and `**strong**` marks are allowed.'
    ),
    title: lineText().describe(
      'The owner, in one to three words, e.g. a team or a system.'
    ),
    tone: slideToneSchema
      .describe(
        'The tone of the rule and title: `primary` for your side, `accent` for the other side (a host, a partner, a customer). Leave it out for a neutral owner.'
      )
      .optional(),
  })
  .strict();

/** One owner and its responsibilities in a {@link SlideTerritoryGroupNode}. */
export type SlideTerritory = z.infer<typeof territorySchema>;

/** Zod schema for {@link SlideTerritoryGroupNode}. */
export const schema = z
  .object({
    type: z.literal('slideTerritoryGroup'),
    items: fromChildren(
      'slideTerritory',
      z
        .array(territorySchema)
        .min(1)
        .max(4)
        .describe(
          'Owners, left to right, in equal columns. 1 to 4. Type does not step down, so long bodies can run past the slide; a layout check reports it.'
        ),
      { text: 'body' }
    ),
  })
  .strict();

/** Who owns what, one color-keyed column per owner. */
export type SlideTerritoryGroupNode = z.infer<typeof schema> & PrimitiveNode;
