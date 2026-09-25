/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { navigationHref, z } from '@elastic/isomer-sdk';

import { sizeField } from '../size';

const linkSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe(
        'One-word caption above the link, e.g. `Docs`. Rendered uppercase.'
      ),
    href: navigationHref().describe('Where the link goes.'),
    text: z
      .string()
      .min(1)
      .describe(
        'The link as the audience reads it, usually the address without its scheme.'
      ),
  })
  .strict();

/** One link on a {@link SlideClosingNode}. */
export type SlideClosingLink = z.infer<typeof linkSchema>;

const pathSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe(
        'A goal the audience may have, as an imperative, e.g. `Write a pack`.'
      ),
    body: z
      .string()
      .min(1)
      .describe('What to read or do first for that goal, in one line.'),
  })
  .strict();

/** One reading path on a {@link SlideClosingNode}. */
export type SlideClosingPath = z.infer<typeof pathSchema>;

/** Zod schema for {@link SlideClosingNode}. */
export const schema = z
  .object({
    type: z.literal('slideClosing'),
    title: z
      .string()
      .min(1)
      .describe('Two or three words that close the deck, e.g. `Start here`.'),
    links: z
      .array(linkSchema)
      .min(1)
      .max(4)
      .describe(
        'Addresses to leave the audience with, most important first. 1–4 links.'
      ),
    paths: z
      .array(pathSchema)
      .max(5)
      .describe(
        'Next steps by goal, listed beside the links. 0–5 paths; empty leaves the title and links alone.'
      ),
    size: sizeField(),
  })
  .strict();

/** The deck's last slide: a title, links, and next steps. */
export type SlideClosingNode = z.infer<typeof schema> & PrimitiveNode;
