/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { slideFrameLayouts } from '../../theme/variants';

/** Zod schema for {@link SlideFrameNode}. */
export const schema = z
  .object({
    type: z.literal('slideFrame'),
    body: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe('Nested slide content. At least one node.'),
    brand: z
      .string()
      .describe('Product or pack name shown beside the mark.')
      .optional(),
    chapter: z.string().min(1).describe('Section title in the topbar.'),
    chapterNumber: z
      .string()
      .describe('Optional index shown before chapter.')
      .optional(),
    footer: z.string().min(1).describe('Right-side footer copy.'),
    layout: z
      .enum(slideFrameLayouts)
      .describe('`title` centers the body. Defaults to `content`.')
      .optional(),
  })
  .strict();
