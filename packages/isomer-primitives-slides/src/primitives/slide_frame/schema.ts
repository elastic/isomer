/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { slideFrameTones } from '../../theme/variants';
import { lineText } from '../authored_text';

import { FRAME_URL_MESSAGE, sanitizeFrameUrl } from './url';

/** Zod schema for {@link SlideFrameNode}. */
export const schema = z
  .object({
    type: z.literal('slideFrame'),
    body: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe(
        'Slide content, top to bottom. Open a content slide with `slideHeading`. At least one node.'
      ),
    brand: lineText()
      .describe(
        'Name at the left of the footer, e.g. the product. Keep it the same on every slide.'
      )
      .optional(),
    section: lineText()
      .describe(
        'Title of the section this slide belongs to, shown in the footer.'
      )
      .optional(),
    sectionNumber: lineText()
      .describe(
        'Number of the section this slide belongs to, shown before `section`.'
      )
      .optional(),
    logo: z
      .boolean()
      .describe(
        'Whether the Isomer mark is drawn beside the footer and on a title slide. Defaults to `true`; set `false` on every slide unless the deck is about Isomer.'
      )
      .optional(),
    tone: z
      .enum(slideFrameTones)
      .describe(
        '`inverse` for title, section, and closing slides; `page` for everything else. Defaults to `page`.'
      )
      .optional(),
    url: lineText()
      .refine((value) => sanitizeFrameUrl(value) !== null, {
        error: FRAME_URL_MESSAGE,
      })
      .describe(
        'Absolute address at the right of the footer, with its scheme, e.g. "https://example.com". A link on web surfaces.'
      )
      .optional(),
  })
  .strict();
