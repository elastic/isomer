/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { boundedHref, hrefRule, lineText } from '../authored_text';
import { sizeField } from '../size';

const sectionSlidesMax = 8;

const slideSchema = z
  .object({
    text: lineText().describe(
      'The composition `title` of this slide, in a few words. `code` and `**strong**` marks are allowed.'
    ),
    href: boundedHref()
      .describe(
        `Where this slide lives: ${hrefRule}. On web surfaces the line links there. Slide addresses belong to the host: use the form its guide gives, and leave this out when it gives none.`
      )
      .optional(),
  })
  .strict();

export type SectionItem = z.infer<typeof slideSchema>;

/** Zod schema for {@link SectionSlideNode}. */
export const schema = z
  .object({
    type: z.literal('sectionSlide'),
    number: lineText().describe('Section number as it should read, e.g. `01`.'),
    title: lineText().describe(
      'Section name in two or three words, e.g. `The problem`.'
    ),
    slides: fromChildren(
      'item',
      z
        .array(slideSchema)
        .min(1)
        .max(sectionSlidesMax)
        .describe(
          'The slides this section covers, in order. 1–8, each a few words.'
        ),
      { text: 'text' }
    ),
    size: sizeField(),
  })
  .strict();

/** An inverse section opener: number, title, and the slides it holds. */
export type SectionSlideNode = z.infer<typeof schema> & PrimitiveNode;
