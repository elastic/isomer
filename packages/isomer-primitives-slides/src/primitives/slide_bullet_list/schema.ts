/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { slideBulletMarkers } from '../../theme/variants';

/** Zod schema for {@link SlideBulletListNode}. */
export const schema = z
  .object({
    type: z.literal('slideBulletList'),
    items: z
      .array(z.string().min(1))
      .min(1)
      .describe('Bullet copy, one string per item.'),
    label: z.string().describe('Optional heading above the list.').optional(),
    marker: z
      .enum(slideBulletMarkers)
      .describe('Marker drawn beside each item. Defaults to `dot`.')
      .optional(),
  })
  .strict();

/** Labeled bullet list with a shared marker. */
export type SlideBulletListNode = z.infer<typeof schema> & PrimitiveNode;
