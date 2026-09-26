/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { slideRenderSurfaces } from '../../theme/variants';
import { crossRefine, crossSuperRefine } from '../cross_field';

import { embeddedCompositionSchema, refineNestedRender } from './embedded';

/** {@link SlideRenderNode}'s schema with `bodyNodeSchema` in the embedded composition's body. */
export const schemaWith = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideRender'),
      slide: z
        .string()
        .min(1)
        .describe(
          'The host’s reference to the slide to embed, e.g. its slug. Until the host fills in `composition`, a striped placeholder captioned with this reference stands in.'
        )
        .optional(),
      composition: embeddedCompositionSchema(bodyNodeSchema)
        .describe(
          'The composition to render, usually one `slideFrame`. Its ids are its own; it cannot embed another render.'
        )
        .optional(),
      surface: z
        .enum(slideRenderSurfaces)
        .describe(
          '`react`, `html`, or `svg` draws the slide scaled into a 16:9 panel; `markdown`, `text`, or `slack` shows that surface’s output in a mono panel.'
        ),
      caption: z
        .string()
        .min(1)
        .describe('One line above the panel saying what the render shows.')
        .optional(),
    })
    .strict()
    .check(
      crossRefine(
        ({ slide, composition }) =>
          slide !== undefined || composition !== undefined,
        {
          error: 'needs a `slide` reference or a `composition`',
          path: ['composition'],
        }
      )
    )
    .check(
      crossSuperRefine(({ composition }, ctx) =>
        refineNestedRender(composition, ctx, ['composition'])
      )
    );

/** Zod schema for {@link SlideRenderNode}. */
export const schema = schemaWith(unresolvedBodyNodeSchema);
