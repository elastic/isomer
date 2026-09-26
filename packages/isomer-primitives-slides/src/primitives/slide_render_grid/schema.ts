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
import {
  embeddedCompositionSchema,
  refineNestedRender,
} from '../slide_render/embedded';

/** {@link SlideRenderGridNode}'s schema with `bodyNodeSchema` in the embedded composition's body. */
export const schemaWith = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideRenderGrid'),
      composition: embeddedCompositionSchema(bodyNodeSchema).describe(
        'The composition every tile renders, usually one `slideFrame`. Its ids are its own; it cannot embed another render.'
      ),
      tiles: z
        .array(
          z
            .object({
              surface: z
                .enum(slideRenderSurfaces)
                .describe(
                  'The surface this tile renders on, shown as its name. `react`, `html`, and `svg` draw the slide; `markdown`, `text`, and `slack` show their output.'
                ),
              caption: z
                .string()
                .min(1)
                .describe(
                  'A few words on what this surface is for, e.g. "Terminals and SMS".'
                ),
            })
            .strict()
        )
        .min(2)
        .max(6)
        .describe(
          'Tiles in reading order, two to six, each surface once. Four tiles make a 2×2 grid; five or six make 3×2.'
        ),
    })
    .strict()
    .check(
      crossRefine(
        ({ tiles }) =>
          new Set(tiles.map(({ surface }) => surface)).size === tiles.length,
        { error: 'each surface may appear once', path: ['tiles'] }
      )
    )
    .check(
      crossSuperRefine(({ composition }, ctx) =>
        refineNestedRender(composition, ctx, ['composition'])
      )
    );

/** Zod schema for {@link SlideRenderGridNode}. */
export const schema = schemaWith(unresolvedBodyNodeSchema);
