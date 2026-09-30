/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { boundedHref, hrefRule, lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const sectionContentsMax = 8;

/** Zod schema for {@link SlideSectionNode}. */
export const schema = z
  .object({
    type: z.literal('slideSection'),
    number: lineText().describe('Section number as it should read, e.g. `01`.'),
    title: lineText().describe(
      'Section name in two or three words, e.g. `The problem`.'
    ),
    contents: z
      .array(lineText())
      .min(1)
      .max(sectionContentsMax)
      .describe(
        'What the section covers: the composition `title` of each slide in it, in order. 1–8 lines, each a few words. `code` and `**strong**` marks are allowed.'
      ),
    hrefs: z
      .array(boundedHref())
      .max(sectionContentsMax)
      .describe(
        `Link for each \`contents\` line, in the same order and of the same length, each ${hrefRule}. On web surfaces each line links to its slide. Slide addresses belong to the host: use the form its guide gives, and leave this out when it gives none.`
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ contents, hrefs }) => !hrefs || hrefs.length === contents.length,
      {
        error: '`hrefs` needs one entry per `contents` line',
        path: ['hrefs'],
        rule: 'one entry per contents entry',
      }
    )
  );

/** An inverse section opener: number, title, and the slides it holds. */
export type SlideSectionNode = z.infer<typeof schema> & PrimitiveNode;
