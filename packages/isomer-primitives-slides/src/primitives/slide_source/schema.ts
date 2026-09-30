/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText } from '../authored_text';

import { prefix } from './prefix';

/** Zod schema for {@link SlideSourceNode}. */
export const schema = z
  .object({
    type: z.literal('slideSource'),
    text: lineText().describe(
      `Where the numbers or claims on the slide come from, in one short line, e.g. "Support tickets, January to June". The slide adds the "${prefix}" prefix. \`code\` and \`**strong**\` marks are allowed.`
    ),
  })
  .strict();

/** One citation line at the foot of a slide. */
export type SlideSourceNode = z.infer<typeof schema> & PrimitiveNode;
