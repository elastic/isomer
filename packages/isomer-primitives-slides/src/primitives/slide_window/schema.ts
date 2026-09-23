/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';

import { slideWindowChromes } from '../../theme/variants';

/** Zod schema for {@link SlideWindowNode}. */
export const schema = z
  .object({
    type: z.literal('slideWindow'),
    body: z
      .array(unresolvedBodyNodeSchema)
      .min(1)
      .describe('Nodes shown inside the window. At least one.'),
    chrome: z
      .enum(slideWindowChromes)
      .describe('The surround: `browser`, `terminal`, `slack`, or `chat`.'),
    title: z
      .string()
      .min(1)
      .describe('Title bar text: a URL, a command, a channel, or a thread.'),
  })
  .strict();
