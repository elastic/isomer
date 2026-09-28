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

const itemSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe(
        'What the bar measures, in one to three words, e.g. `Leeds`. `code` and `**strong**` marks are allowed.'
      ),
    value: z
      .number()
      .min(0)
      .describe(
        'The measured amount, zero or more. The bar’s length is drawn from it.'
      ),
    detail: z
      .string()
      .min(1)
      .describe(
        'One short line under the bar in mono, e.g. what the number counts. Keep it to one line. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    highlight: z
      .boolean()
      .describe(
        'Draws this bar in primary, as the one the slide is about. At most one item. Defaults to false.'
      )
      .optional(),
  })
  .strict();

/** One bar of a {@link SlideBarsNode}. */
export type SlideBarsItem = z.infer<typeof itemSchema>;

/** Zod schema for {@link SlideBarsNode}. */
export const schema = z
  .object({
    type: z.literal('slideBars'),
    items: z
      .array(itemSchema)
      .min(2)
      .max(6)
      .describe(
        'Bars top to bottom, usually largest first. Two to six, all in the same unit.'
      ),
    max: z
      .number()
      .positive()
      .describe(
        'The value a full-length bar stands for, at least the largest value. Leave it out to scale to the largest value.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ items }) => items.filter(({ highlight }) => highlight).length <= 1,
      {
        error: 'at most one item can be highlighted',
        path: ['items'],
      }
    )
  )
  .check(
    crossRefine(
      ({ items, max }) =>
        max === undefined || items.every(({ value }) => value <= max),
      { error: 'max must be at least every value', path: ['max'] }
    )
  );

/** Comparable amounts drawn as horizontal bars, at most one highlighted. */
export type SlideBarsNode = z.infer<typeof schema> & PrimitiveNode;
