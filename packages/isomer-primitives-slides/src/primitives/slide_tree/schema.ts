/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

const entrySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe(
        'File or folder name, set in monospace. End a folder with `/`. Entries sit one level under `root`; deeper nesting is not drawn.'
      ),
    body: z
      .string()
      .min(1)
      .describe('What the entry holds or does, in a short phrase.'),
  })
  .strict();

/** One file or folder in a {@link SlideTreeNode}. */
export type SlideTreeEntry = z.infer<typeof entrySchema>;

/** Zod schema for {@link SlideTreeNode}. */
export const schema = z
  .object({
    type: z.literal('slideTree'),
    root: z
      .string()
      .min(1)
      .describe('The folder being shown, e.g. `checkout/`.'),
    entries: z
      .array(entrySchema)
      .min(1)
      .max(10)
      .describe(
        'Contents of `root`, in display order. 1 to 10. The branch connectors are drawn for you; do not type them.'
      ),
  })
  .strict();

/** A folder and its entries, each with a one-line note. */
export type SlideTreeNode = z.infer<typeof schema> & PrimitiveNode;
