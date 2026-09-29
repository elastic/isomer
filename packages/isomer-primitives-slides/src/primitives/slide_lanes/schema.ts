/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';
import { slideToneSchema } from '../tone_schema';

const laneSchema = z
  .object({
    label: lineText().describe(
      'The path’s name in one or two words, set in capitals, e.g. "Web".'
    ),
    steps: z
      .array(lineText().describe('One step, set as a code-style chip.'))
      .min(1)
      .max(5)
      .describe(
        'Steps along this path, left to right, each one to three words. 1 to 5. Chips do not wrap and type does not step down, so long steps can run past the slide; a layout check reports it.'
      ),
    tone: slideToneSchema
      .describe(
        'The tone of this path: `primary` for your own product, `accent` for the host or another party. Leave it out for a neutral path.'
      )
      .optional(),
  })
  .strict();

const noteSchema = z
  .object({
    title: lineText().describe('What this path is, in a few words.'),
    body: wrappedText().describe(
      'One or two sentences on how this path differs. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

/** One path of a {@link SlideLanesNode}. */
export type SlideLanesLane = z.infer<typeof laneSchema>;

/** A note under a {@link SlideLanesNode}. */
export type SlideLanesNote = z.infer<typeof noteSchema>;

/** Zod schema for {@link SlideLanesNode}. */
export const schema = z
  .object({
    type: z.literal('slideLanes'),
    lanes: z
      .array(laneSchema)
      .length(2)
      .describe(
        'Exactly two paths, drawn one above the other, that converge on `join`.'
      ),
    join: lineText().describe(
      'The single step both paths feed into, set as a filled chip on the right, e.g. "Checkout".'
    ),
    notes: z
      .array(noteSchema)
      .max(4)
      .describe(
        'Notes under the lanes, two per row, usually one per lane in lane order, saying how that path differs. Up to 4. Leave it out for none. Type does not step down, so long notes can run past the slide; a layout check reports it.'
      )
      .optional(),
  })
  .strict();

/** Two parallel paths converging on one join step. */
export type SlideLanesNode = z.infer<typeof schema> & PrimitiveNode;
