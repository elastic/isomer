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

import { embeddedBody } from './embedded';

/** Shared by `schema`, `schemaFor`, and `slideAnnotatedRender`. */
export const buildSchema = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideRender'),
      slide: lineText()
        .describe(
          'The host’s reference to the slide to embed, e.g. its slug. Until the host fills in `body`, a striped placeholder labeled with this reference stands in. A render needs `slide`, `body`, or both.'
        )
        .optional(),
      body: embeddedBody(bodyNodeSchema)
        .describe(
          'What to render: one `slideFrame` alone, holding a whole slide, or one or more nodes that are not frames. Its ids are its own; it cannot hold another slideRender, slideRenderGrid, or slideAnnotatedRender.'
        )
        .optional(),
      surface: z
        .enum(slideRenderSurfaces)
        .describe(
          '`react`, `html`, or `svg` draws the slide scaled into a 16:9 panel; `markdown`, `text`, or `slack` shows that surface’s output in a mono panel.'
        ),
      caption: lineText()
        .describe('One line above the panel saying what the render shows.')
        .optional(),
    })
    .strict()
    .check(
      crossRefine(
        ({ slide, body }) => slide !== undefined || body !== undefined,
        { error: 'needs a `slide` reference or a `body`', path: ['body'] }
      )
    );

/** Zod schema for {@link SlideRenderNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
