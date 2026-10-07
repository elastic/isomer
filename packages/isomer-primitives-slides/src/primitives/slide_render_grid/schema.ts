/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { slideRenderSurfaces } from '../../theme/variants';
import { lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { embeddedBody } from '../slide_render/embedded';

/** Shared by `schema` and `schemaFor`. */
export const buildSchema = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideRenderGrid'),
      body: embeddedBody(bodyNodeSchema, 'What every tile renders.'),
      tiles: z
        .array(
          z
            .object({
              surface: z
                .enum(slideRenderSurfaces)
                .describe(
                  'The surface this tile renders on, shown as its name. `react`, `html`, and `snapshot` draw the slide; `markdown`, `text`, and `slack` show their output.'
                ),
              caption: lineText().describe(
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
        ({ tiles }) => {
          const surfaces = tiles.flatMap(({ surface }) =>
            (slideRenderSurfaces as readonly string[]).includes(surface)
              ? [surface]
              : []
          );
          return new Set(surfaces).size === surfaces.length;
        },
        {
          error: 'each surface may appear once',
          path: ['tiles'],
          rule: 'Tiles in reading order, two to six, each surface once.',
        }
      )
    );

/** Zod schema for {@link SlideRenderGridNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
