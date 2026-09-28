/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const columnSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe(
        'Name of the option, in one to four words. `code` and `**strong**` marks are allowed.'
      ),
    tags: z
      .array(z.string().min(1))
      .min(1)
      .max(6)
      .describe(
        'Short identifiers that belong to this option, shown as monospace chips, e.g. environments or file types. 1 to 6; leave it out for none.'
      )
      .optional(),
    body: z
      .string()
      .min(1)
      .describe(
        'One or two sentences on what sets this option apart. `code` and `**strong**` marks are allowed.'
      ),
  })
  .strict();

/** One column in a {@link SlideColumnsNode}. */
export type SlideColumn = z.infer<typeof columnSchema>;

/** Zod schema for {@link SlideColumnsNode}. */
export const schema = z
  .object({
    type: z.literal('slideColumns'),
    items: z
      .array(columnSchema)
      .min(2)
      .max(4)
      .describe('Parallel options, left to right, in equal columns. 2 to 4.'),
    highlight: z
      .number()
      .int()
      .min(0)
      .describe(
        'Index into `items` of the option the slide recommends: a bar in the `primary` tone tops its column and its title takes that tone. Text surfaces show no highlight, so name it in the heading.'
      )
      .optional(),
    footnote: z
      .object({
        code: z
          .string()
          .min(1)
          .describe(
            'An identifier set in monospace, e.g. a flag or setting name.'
          ),
        text: z
          .string()
          .min(1)
          .describe(
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
