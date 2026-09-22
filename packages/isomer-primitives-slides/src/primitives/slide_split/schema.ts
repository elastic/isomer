/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { slideSplitRatios } from '../../theme/variants';

/** Zod schema for {@link SlideSplitNode}. */
export const schema = z
  .object({
    type: z.literal('slideSplit'),
    left: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe('Nodes in the left column. At least one.'),
    ratio: z
      .enum(slideSplitRatios)
      .describe('Column widths. Defaults to `even`.')
      .optional(),
    right: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe('Nodes in the right column. At least one.'),
  })
  .strict();
