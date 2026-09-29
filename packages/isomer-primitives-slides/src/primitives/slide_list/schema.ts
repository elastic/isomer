/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';

const itemSchema = z
  .object({
    term: lineText()
      .describe(
        'Short name the fact is about, set in monospace in a left column. Omit it for a plain fact; a list with no terms drops its rules and reads as a compact stack.'
      )
      .optional(),
    body: wrappedText().describe(
      'The fact, in one short sentence. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

export type SlideListItem = z.infer<typeof itemSchema>;

/** Zod schema for {@link SlideListNode}. */
export const schema = z
  .object({
    type: z.literal('slideList'),
    label: lineText()
      .describe('Uppercase caption above the list, in a few words.')
      .optional(),
    items: z
      .array(itemSchema)
      .min(1)
      .max(6)
      .describe(
        'Facts, top to bottom. 1 to 6. Type does not step down, so long facts can run past the slide; a layout check reports it.'
      ),
    footnote: wrappedText()
      .describe(
        'One or two sentences under the list that qualify every row. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
  })
  .strict();

/** Short facts with optional terms, a caption, and a footnote. */
export type SlideListNode = z.infer<typeof schema> & PrimitiveNode;
