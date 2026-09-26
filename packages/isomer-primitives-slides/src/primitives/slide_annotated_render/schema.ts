/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { schemaWith as renderSchemaWith } from '../slide_render/schema';

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
    title: z
      .string()
      .min(1)
      .describe(
        'The part the pin points at, in a few words. `code` and `**strong**` marks are allowed.'
      ),
    body: z
      .string()
      .min(1)
      .describe(
        'One short sentence on what that part does or why it matters. `code` and `**strong**` marks are allowed.'
      ),
  })
  .strict();

/** One numbered pin of a {@link SlideAnnotatedRenderNode}. */
export type SlideAnnotatedRenderPin = z.infer<typeof pinSchema>;

/** {@link SlideAnnotatedRenderNode}'s schema with `bodyNodeSchema` in the render's embedded composition. */
export const schemaWith = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideAnnotatedRender'),
      render: renderSchemaWith(bodyNodeSchema).describe(
        'The `slideRender` to annotate, usually on the `svg` surface. It fills the wider column; its caption sits above it.'
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
export const schema = schemaWith(unresolvedBodyNodeSchema);
