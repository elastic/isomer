/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { lineText, wrappedText } from '../authored_text';
import { buildSchema as buildRenderSchema } from '../slide_render/schema';

const pinSchema = z
  .object({
    x: z
      .number()
      .min(0)
      .max(100)
      .describe(
        'Where the pin sits across the render, as a percentage from its left edge.'
      ),
    y: z
      .number()
      .min(0)
      .max(100)
      .describe(
        'Where the pin sits down the render, as a percentage from its top edge.'
      ),
    title: lineText().describe('The part the pin points at, in a few words.'),
    body: wrappedText().describe(
      'One short sentence on what that part does or why it matters. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

export type SlideAnnotatedRenderPin = z.infer<typeof pinSchema>;

/** Shared by `schema` and `schemaFor`. */
export const buildSchema = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideAnnotatedRender'),
      render: buildRenderSchema(bodyNodeSchema).describe(
        'The slideRender to annotate, usually on the `svg` surface. It fills the wider column; its caption sits above it.'
      ),
      pins: z
        .array(pinSchema)
        .min(1)
        .max(6)
        .describe(
          'One to six numbered pins, in the order the legend beside the render explains them.'
        ),
    })
    .strict();

/** Zod schema for {@link SlideAnnotatedRenderNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
