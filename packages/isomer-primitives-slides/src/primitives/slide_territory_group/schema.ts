/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { slideToneSchema } from '../tone_schema';

const territorySchema = z
  .object({
    body: z.string().min(1).describe('Supporting copy under the title.'),
    title: z.string().min(1).describe('Territory heading.'),
    tone: slideToneSchema.describe('Accent applied to the title.').optional(),
  })
  .strict();

/** One ownership note in a {@link SlideTerritoryGroupNode}. */
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
        .describe('Territories to list. At least one.'),
      { text: 'body' }
    ),
  })
  .strict();

/** Ownership annotations paired with accent colors. */
export type SlideTerritoryGroupNode = z.infer<typeof schema> & PrimitiveNode;
