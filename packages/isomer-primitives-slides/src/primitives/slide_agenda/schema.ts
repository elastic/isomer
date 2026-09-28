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

const sectionSchema = z
  .object({
    number: z
      .string()
      .min(1)
      .describe(
        'Section number as it should read, e.g. `01`. One or two characters.'
      ),
    title: z
      .string()
      .min(1)
      .describe('Section name in two or three words, e.g. `The problem`.'),
    count: z
      .string()
      .min(1)
      .describe(
        'How long the section runs, set small at the end of the row, e.g. "3 slides". The current section shows "You are here" in its place.'
      )
      .optional(),
    current: z
      .boolean()
      .describe(
        'Marks the section the talk is in now, drawn in primary; the sections before it are dimmed. At most one. Defaults to false.'
      )
      .optional(),
  })
  .strict();

/** Zod schema for {@link SlideAgendaNode}. */
export const schema = z
  .object({
    type: z.literal('slideAgenda'),
    sections: z
      .array(sectionSchema)
      .min(2)
      .max(8)
      .describe('Every section of the talk, in order. 2 to 8.'),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ sections }) => sections.filter(({ current }) => current).length <= 1,
      { error: 'at most one section can be current', path: ['sections'] }
    )
  );

/** One row of a {@link SlideAgendaNode}. */
export type SlideAgendaSection = z.infer<typeof sectionSchema>;

/** Every section of a talk in a ruled list, with at most one current. */
export type SlideAgendaNode = z.infer<typeof schema> & PrimitiveNode;
