/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { navigationHref, z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

/** Zod schema for {@link SlideSectionNode}. */
export const schema = z
  .object({
    type: z.literal('slideSection'),
    number: z
      .string()
      .min(1)
      .describe(
        'Section number as it should read, e.g. `01`. One or two characters.'
      ),
    title: z
      .string()
      .min(1)
      .describe('Section name in two or three words, e.g. `The problem`.'),
    contents: z
      .array(z.string().min(1))
      .min(1)
      .max(8)
      .describe(
        'What the section covers, one line per slide in it, usually each slide’s heading. 1–8 lines.'
      ),
    hrefs: z
      .array(navigationHref())
      .describe(
        'Link for each `contents` line, in the same order and of the same length, e.g. `#slide-4`. On web surfaces each line links to its slide.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .refine(({ contents, hrefs }) => !hrefs || hrefs.length === contents.length, {
    error: '`hrefs` needs one entry per `contents` line',
    path: ['hrefs'],
  });

/** An inverse section opener: number, title, and the slides it holds. */
export type SlideSectionNode = z.infer<typeof schema> & PrimitiveNode;
