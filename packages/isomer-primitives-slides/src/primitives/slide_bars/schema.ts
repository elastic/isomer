/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const itemSchema = z
  .object({
    label: lineText().describe(
      'What the bar measures, in one to three words, e.g. `Leeds`. `code` and `**strong**` marks are allowed.'
    ),
    value: z
      .number()
      .min(0)
      .describe(
        'The measured amount, zero or more. The bar’s length is drawn from it, and the number prints beside the bar.'
      ),
    detail: lineText()
      .describe(
        'One short line under the bar in mono, e.g. what the number counts. `code` and `**strong**` marks are allowed.'
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

const maxBars = 6;

/** Zod schema for {@link SlideBarsNode}. */
export const schema = z
  .object({
    type: z.literal('slideBars'),
    items: z
      .array(itemSchema)
      .min(2)
      .max(maxBars)
      .describe(
        'Bars top to bottom, usually largest first. 2 to 6, all in the same unit.'
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
      ({ items }) =>
        items.length > maxBars ||
        items.filter(({ highlight }) => highlight).length <= 1,
      { error: 'at most one item can be highlighted', path: ['items'] }
    )
  )
  .check(
    crossRefine(
      ({ items, max }) =>
        max === undefined ||
        items.length > maxBars ||
        items.every(({ value }) => value <= max),
      { error: 'max must be at least every value', path: ['max'] }
    )
  );

/** Comparable amounts drawn as horizontal bars, at most one highlighted. */
export type SlideBarsNode = z.infer<typeof schema> & PrimitiveNode;
