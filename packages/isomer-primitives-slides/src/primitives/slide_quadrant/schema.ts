/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText } from '../authored_text';
import { sizeField } from '../size';

const axisSchema = (name: string, low: string, high: string) =>
  z
    .object({
      low: lineText().describe(
        `The ${low} end of the ${name} axis, one or two words.`
      ),
      high: lineText().describe(
        `The ${high} end of the ${name} axis, one or two words.`
      ),
    })
    .strict();

const quadrantSchema = z
  .object({
    label: lineText().describe(
      'A short caption naming the quadrant, set in its outer corner, e.g. “Quick wins”.'
    ),
    items: z
      .array(lineText().describe('One or two words, set as a chip.'))
      .max(4)
      .describe('0 to 4 things that belong in this quadrant, set as chips.'),
  })
  .strict();

/** One cell of a {@link SlideQuadrantNode}. */
export type SlideQuadrant = z.infer<typeof quadrantSchema>;

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
        'Index into `quadrants` of the one the slide is about: its cell is tinted, its caption and chips draw in primary, and its caption is marked on every surface.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();

/** Items sorted into four quadrants by two labeled axes. */
export type SlideQuadrantNode = z.infer<typeof schema> & PrimitiveNode;

/** Each quadrant's vertical then horizontal axis end, in schema order: TL, TR, BL, BR. */
export const quadrantPlaces = ({
  x,
  y,
}: Pick<SlideQuadrantNode, 'x' | 'y'>): string[] =>
  [
    [y.high, x.low],
    [y.high, x.high],
    [y.low, x.low],
    [y.low, x.high],
  ].map((ends) => ends.join(', '));
