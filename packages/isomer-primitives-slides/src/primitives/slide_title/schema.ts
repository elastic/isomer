/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

const definitionSchema = z
  .object({
    term: z
      .string()
      .min(1)
      .describe(
        'The word being defined, with its part of speech, e.g. `ledger n.`. Set in italics.'
      ),
    text: z
      .string()
      .min(1)
      .describe(
        'The definition, in one sentence. `code` and `**strong**` marks are allowed.'
      ),
  })
  .strict();

/** Zod schema for {@link SlideTitleNode}. */
export const schema = z
  .object({
    type: z.literal('slideTitle'),
    eyebrow: z
      .string()
      .min(1)
      .describe(
        'What the subject is, in a few words above the title, e.g. `A delivery platform`. Rendered uppercase.'
      )
      .optional(),
    title: z
      .string()
      .min(1)
      .describe(
        'The deck’s subject, usually a single name. Set very large; one or two words.'
      ),
    tagline: z
      .string()
      .min(1)
      .describe(
        'The deck’s promise in one short sentence. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    definition: definitionSchema
      .describe(
        'A dictionary-style line under the tagline that explains the name.'
      )
      .optional(),
    aside: unresolvedBodyNodeSchema
      .describe(
        'One compact node drawn beside the title in a column under half the slide: a `slideFanout` of what the subject feeds, a `slideStats` of two figures, a short `slideList`, or a `slideRender`. Omit to leave the title alone.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();
