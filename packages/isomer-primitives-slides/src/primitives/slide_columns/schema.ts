/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const columnSchema = z
  .object({
    title: lineText().describe('Name of the option, in one to four words.'),
    tags: z
      .array(lineText())
      .min(1)
      .max(6)
      .describe(
        'Short identifiers that belong to this option, shown as monospace chips, e.g. environments or file types. 1 to 6; leave it out for none.'
      )
      .optional(),
    body: wrappedText().describe(
      'One or two sentences on what sets this option apart. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

export type SlideColumn = z.infer<typeof columnSchema>;

/** Zod schema for {@link SlideColumnsNode}. */
export const schema = z
  .object({
    type: z.literal('slideColumns'),
    items: fromChildren(
      'slideColumn',
      z
        .array(columnSchema)
        .min(2)
        .max(4)
        .describe('Parallel options, left to right, in equal columns. 2 to 4.'),
      { text: 'body' }
    ),
    highlight: z
      .number()
      .int()
      .min(0)
      .describe(
        'Index into `items` of the option the slide recommends: a bar tops its column and its title takes the `primary` tone.'
      )
      .optional(),
    footnote: z
      .object({
        code: lineText().describe(
          'An identifier set in monospace, e.g. a flag or setting name.'
        ),
        text: wrappedText().describe(
          'What the identifier does to the options above, in one sentence. `code` and `**strong**` marks are allowed.'
        ),
      })
      .strict()
      .describe('One line under a rule that qualifies every column.')
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ items, highlight }) =>
        highlight === undefined || highlight < items.length,
      { error: 'must be an index into `items`', path: ['highlight'] }
    )
  );

/** Two to four parallel options, each with a title, tags, and body. */
export type SlideColumnsNode = z.infer<typeof schema> & PrimitiveNode;
