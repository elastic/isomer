/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { boundedHref, lineText, wrappedText } from '../authored_text';
import { sizeField } from '../size';

const linkSchema = z
  .object({
    label: lineText().describe(
      'One-word caption above the link, e.g. `Docs`. Rendered uppercase.'
    ),
    href: boundedHref().describe('Where the link goes.'),
    text: lineText().describe(
      'The link as the audience reads it: `href` without its scheme, e.g. `example.com/docs` for `https://example.com/docs`, so someone can type what they see. Keep it under about 28 characters: it is set large, and a longer one wraps.'
    ),
  })
  .strict();

export type SlideClosingLink = z.infer<typeof linkSchema>;

const pathSchema = z
  .object({
    title: lineText().describe(
      'A goal the audience may have, as an imperative, e.g. `Write a pack`.'
    ),
    body: wrappedText().describe(
      'What to read or do first for that goal, in one line. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

export type SlideClosingPath = z.infer<typeof pathSchema>;

/** Zod schema for {@link SlideClosingNode}. */
export const schema = z
  .object({
    type: z.literal('slideClosing'),
    title: lineText().describe(
      'Two or three words that close the deck, e.g. `Start here`.'
    ),
    links: z
      .array(linkSchema)
      .min(1)
      .max(4)
      .describe(
        'Addresses to leave the audience with, most important first. 1–4 links.'
      ),
    paths: z
      .array(pathSchema)
      .min(1)
      .max(5)
      .describe(
        'Next steps by goal, listed beside the links. 1–5 paths; leave it out to set the title and links alone.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict();

/** The deck's last slide: a title, links, and next steps. */
export type SlideClosingNode = z.infer<typeof schema> & PrimitiveNode;
