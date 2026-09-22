/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { slideStackSpacings } from '../../theme/variants';

/** Zod schema for {@link SlideStackNode}. */
export const schema = z
  .object({
    type: z.literal('slideStack'),
    spacing: z
      .enum(slideStackSpacings)
      .describe('Gap between items. Defaults to `normal`.')
      .optional(),
    items: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe('Nodes from top to bottom. At least one.'),
  })
  .strict();
