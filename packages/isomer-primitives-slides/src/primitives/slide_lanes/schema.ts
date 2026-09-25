/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

const laneSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe('A one- or two-word uppercase name for the path, e.g. "Web".'),
    steps: z
      .array(
        z
          .string()
          .min(1)
          .describe('One step, set as a code-style chip; one to three words.')
      )
      .min(1)
      .max(5)
      .describe(
        '1–5 steps along this path, left to right, each a short code-style chip of one to three words.'
      ),
  })
  .strict();

const noteSchema = z
  .object({
    title: z.string().min(1).describe('What this path is, in a few words.'),
    body: z
      .string()
      .min(1)
      .describe('One or two sentences on how this path differs.'),
  })
  .strict();

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
    join: z
      .string()
      .min(1)
      .describe(
        'The single step both paths feed into, set as a filled chip on the right, e.g. "Checkout".'
      ),
    notes: z
      .array(noteSchema)
      .max(4)
      .describe(
        'Up to 4 notes under the lanes, two per row. Usually one per lane, in lane order, saying how that path differs. Omit for none.'
      )
      .optional(),
  })
  .strict();

/** One path of a {@link SlideLanesNode}. */
export type SlideLanesLane = z.infer<typeof laneSchema>;

/** A note under a {@link SlideLanesNode}. */
export type SlideLanesNote = z.infer<typeof noteSchema>;

/** Two parallel paths converging on one join step. */
export type SlideLanesNode = z.infer<typeof schema> & PrimitiveNode;
