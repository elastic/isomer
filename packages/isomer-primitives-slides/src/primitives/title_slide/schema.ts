/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { IsomerError, unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { lineText, wrappedText } from '../authored_text';
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

export const asideDescription =
  'One compact node drawn beside the title in a column under half the slide: a `slideFanout` of what the subject feeds, or a short `slideList` or `slideBulletList`. Omit to leave the title alone.';

/** Zod schema for {@link TitleSlideNode}. */
export const schema = z
  .object({
    type: z.literal('titleSlide'),
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
        'The deck’s promise in one short sentence. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    definition: fromChildren(
      'definition',
      definitionSchema.describe(
        'A dictionary-style line under the tagline that explains the name.'
      ),
      { text: 'text' }
    ).optional(),
    aside: fromChildren(
      'aside',
      unresolvedBodyNodeSchema.describe(asideDescription),
      {
        toItem: ({ children }: { children?: ReactNode }, { parseChildren }) => {
          const nodes = parseChildren(children);
          if (nodes.length !== 1) {
            throw new IsomerError(
              'UNEXPECTED_CHILDREN',
              '<TitleSlide.Aside> takes one slide node.'
            );
          }
          return nodes[0];
        },
      }
    ).optional(),
    size: sizeField(),
  })
  .strict();
