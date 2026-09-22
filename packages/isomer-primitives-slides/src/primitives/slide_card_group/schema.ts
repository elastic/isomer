/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import {
  slideCardColumnCounts,
  slideCardGroupStyles,
} from '../../theme/variants';
import { slideToneSchema } from '../tone_schema';

const cardSchema = z
  .object({
    badge: z
      .string()
      .describe('Small tag, often a number or status.')
      .optional(),
    body: z.string().min(1).describe('Supporting copy under the title.'),
    label: z
      .string()
      .describe('Optional heading above the card title.')
      .optional(),
    title: z.string().min(1).describe('Card heading.'),
    tone: slideToneSchema
      .describe('Accent applied to the badge and title.')
      .optional(),
  })
  .strict();

/** One card in a {@link SlideCardGroupNode}. */
export type SlideCard = z.infer<typeof cardSchema>;

/** Zod schema for {@link SlideCardGroupNode}. */
export const schema = z
  .object({
    type: z.literal('slideCardGroup'),
    cards: fromChildren(
      'slideCard',
      z.array(cardSchema).min(1).describe('Cards to lay out.'),
      { text: 'body' }
    ),
    columns: z
      .literal(slideCardColumnCounts)
      .describe('Column count from 1 to 6. Defaults to 3.')
      .optional(),
    style: z
      .enum(slideCardGroupStyles)
      .describe('`feature` enlarges type and treats `badge` as a hero figure.')
      .optional(),
  })
  .strict();

/** Grid of labeled cards. */
export type SlideCardGroupNode = z.infer<typeof schema> & PrimitiveNode;
