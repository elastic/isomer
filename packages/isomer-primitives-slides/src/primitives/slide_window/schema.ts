/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { slideWindowChromes } from '../../theme/variants';
import { crossRefine } from '../cross_field';
import { EMBEDDING_TYPES } from '../slide_render/embedded';

// Walks nested slide nodes, skipping an embedded composition: that window
// sits in another slide.
const holdsWindow = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(holdsWindow);
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.type === 'slideWindow') {
    return true;
  }
  return Object.entries(record).some(
    ([key, child]) =>
      !(
        typeof record.type === 'string' &&
        EMBEDDING_TYPES.has(record.type) &&
        key === 'composition'
      ) && holdsWindow(child)
  );
};

/** The window schema over `nodeSchema`, so `schemaFor` keeps the refine. */
export const buildSchema = (nodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideWindow'),
      chrome: z
        .enum(slideWindowChromes)
        .describe(
          'The app the content appears in: `browser`, `terminal`, `slack`, or `chat`. Only the title bar changes; `slack` shows the title as a channel.'
        ),
      title: z
        .string()
        .min(1)
        .describe(
          'Title bar text: a URL, a command, a thread name, or for `slack` the channel name without `#`.'
        ),
      body: z
        .array(nodeSchema)
        .min(1)
        .describe(
          'Nodes shown inside the window, top to bottom, e.g. a slideTable or slideTranscript. At least one; never another slideWindow.'
        ),
    })
    .strict()
    .check(
      crossRefine(({ body }) => !holdsWindow(body), {
        error: 'a window cannot hold another window',
        path: ['body'],
      })
    );

/** Zod schema for {@link SlideWindowNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
