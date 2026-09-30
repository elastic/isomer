/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { layoutCheckNote, lineText, wrappedText } from '../authored_text';
import { sizeField } from '../size';

const definitionSchema = z
  .object({
    term: lineText().describe(
      'The word being defined, with its part of speech, e.g. `ledger n.`. Set in italics.'
    ),
    text: wrappedText().describe(
      'The definition, in one sentence. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

/** Zod schema for {@link SlideTitleNode}. */
export const schema = z
  .object({
    type: z.literal('slideTitle'),
    eyebrow: lineText()
      .describe(
        'What the subject is, in a few words above the title, e.g. `A delivery platform`. Rendered uppercase.'
      )
      .optional(),
    title: wrappedText().describe(
      'The deck’s subject, usually a single name. Set very large; one or two words.'
    ),
    tagline: wrappedText()
      .describe(
        `The deck’s promise in one short sentence; a long one can run past the slide, and ${layoutCheckNote}. \`code\` and \`**strong**\` marks are allowed.`
      )
      .optional(),
    definition: definitionSchema
      .describe(
        'A dictionary-style line under the tagline that explains the name.'
      )
      .optional(),
    aside: unresolvedBodyNodeSchema
      .describe(
        'One compact node drawn beside the title in a column under half the slide, such as a short `slideBulletList` of what the subject does. Omit to leave the title alone.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();
