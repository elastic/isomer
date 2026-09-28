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
      .max(6)
      .describe(
        'Points, top to bottom, one short sentence each. 1 to 6. `code` and `**strong**` marks are allowed.'
      ),
    label: z
      .string()
      .min(1)
      .describe('Uppercase caption above the list, in a few words.')
      .optional(),
    marker: z
      .enum(slideBulletMarkers)
      .describe(
        'Marker beside each item: `dot` for neutral points, `check` for things done or included, `x` for things left out. Defaults to `dot`.'
      )
      .optional(),
  })
  .strict();

/** Short unordered points with a shared marker. */
export type SlideBulletListNode = z.infer<typeof schema> & PrimitiveNode;
