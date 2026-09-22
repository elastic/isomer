/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { navigationHref, z } from '@elastic/isomer-sdk';

import { slideTitleSizes } from '../../theme/variants';
import { slideToneSchema } from '../tone_schema';

const ledeLinkSchema = z
  .object({
    type: z.literal('link'),
    text: z.string().min(1).describe('Visible link text.'),
    href: navigationHref().describe(
      'Navigation target; must pass `navigationHref()`.'
    ),
    openInNewTab: z
      .boolean()
      .describe('When true, open in a new tab.')
      .optional(),
  })
  .strict();

/** Inline link inside a {@link SlideTitleNode} lede. */
export type SlideLedeLink = z.infer<typeof ledeLinkSchema>;

/** One run of a {@link SlideTitleNode.lede}: plain text or a {@link SlideLedeLink}. */
export type SlideLedePart = string | SlideLedeLink;

const ledeSchema = z.union([
  z.string(),
  z.array(z.union([z.string(), ledeLinkSchema])).readonly(),
]);

/** Zod schema for {@link SlideTitleNode}. */
export const schema = z
  .object({
    type: z.literal('slideTitle'),
    eyebrow: z.string().describe('Small kicker above the headline.').optional(),
    lede: ledeSchema
      .describe('Supporting sentence, either a string or mixed text and links.')
      .optional(),
    size: z
      .enum(slideTitleSizes)
      .describe('Headline scale. Defaults to `standard`.')
      .optional(),
    title: z.string().min(1).describe('Primary headline.'),
    tone: slideToneSchema.describe('Accent applied to the eyebrow.').optional(),
  })
  .strict();

/** Presentation eyebrow, headline, and optional lede. */
export type SlideTitleNode = z.infer<typeof schema> & PrimitiveNode;
