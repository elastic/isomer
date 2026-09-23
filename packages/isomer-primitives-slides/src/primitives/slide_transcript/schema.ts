/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import {
  slideTranscriptFormats,
  slideTranscriptRoles,
} from '../../theme/variants';

const turnSchema = z
  .object({
    format: z
      .enum(slideTranscriptFormats)
      .describe('`code` sets the text in monospace. Defaults to `prose`.')
      .optional(),
    role: z
      .enum(slideTranscriptRoles)
      .describe('Who speaks: `user`, `model`, or the `host` application.'),
    text: z.string().min(1).describe('What was said. Newlines are kept.'),
  })
  .strict();

/** One turn in a {@link SlideTranscriptNode}. */
export type SlideTranscriptTurn = z.infer<typeof turnSchema>;

/** Zod schema for {@link SlideTranscriptNode}. */
export const schema = z
  .object({
    type: z.literal('slideTranscript'),
    label: z
      .string()
      .describe('Optional heading above the conversation.')
      .optional(),
    turns: fromChildren(
      'slideTurn',
      z
        .array(turnSchema)
        .min(1)
        .max(8)
        .describe('Turns in order. One to eight.'),
      { text: 'text' }
    ),
  })
  .strict();

/** A short exchange between a user, a model, and the host. */
export type SlideTranscriptNode = z.infer<typeof schema> & PrimitiveNode;
