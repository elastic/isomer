/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

const axisSchema = (name: string, low: string, high: string) =>
  z
    .object({
      low: z
        .string()
        .min(1)
        .describe(`The ${low} end of the ${name} axis, one or two words.`),
      high: z
        .string()
        .min(1)
        .describe(`The ${high} end of the ${name} axis, one or two words.`),
    })
    .strict();

const quadrantSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe(
        'A short caption naming the quadrant, set in its outer corner, e.g. "Quick wins".'
      ),
    items: z
      .array(z.string().min(1).describe('One or two words, set as a chip.'))
      .max(4)
      .describe('0–4 things that belong in this quadrant, set as chips.'),
  })
  .strict();

/** Zod schema for {@link SlideQuadrantNode}. */
export const schema = z
  .object({
    type: z.literal('slideQuadrant'),
    x: axisSchema('horizontal', 'left', 'right').describe(
      'The horizontal axis: `low` labels the left end, `high` the right.'
    ),
    y: axisSchema('vertical', 'bottom', 'top').describe(
      'The vertical axis: `low` labels the bottom end, `high` the top.'
    ),
    quadrants: z
      .array(quadrantSchema)
      .length(4)
      .describe(
        'Exactly four quadrants, in the order top-left, top-right, bottom-left, bottom-right. Items go in a quadrant, never at a coordinate.'
      ),
    highlight: z
      .number()
      .int()
      .min(0)
      .max(3)
      .describe(
        'Index into `quadrants` of the one the slide is about: its cell is tinted and its caption and chips draw in primary. Text surfaces show no highlight, so name it in the heading.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();

/** One cell of a {@link SlideQuadrantNode}. */
export type SlideQuadrant = z.infer<typeof quadrantSchema>;

/** Items sorted into four quadrants by two labeled axes. */
export type SlideQuadrantNode = z.infer<typeof schema> & PrimitiveNode;
