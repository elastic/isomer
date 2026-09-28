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
      .describe(
        '`code` sets the text in monospace, for JSON, commands, and errors; `prose` sets it as sentences. Defaults to `prose`.'
      )
      .optional(),
    role: z
      .enum(slideTranscriptRoles)
      .describe(
        'Who speaks: `user` (right-aligned), `model`, or the `host` application that runs the model.'
      ),
    text: z
      .string()
      .min(1)
      .describe(
        'What was said. Keep it to a sentence or a short line of code. Newlines are kept.'
      ),
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
      .min(1)
      .describe(
        'Short uppercase label above the conversation, e.g. what the exchange shows.'
      )
      .optional(),
    turns: fromChildren(
      'slideTurn',
      z
        .array(turnSchema)
        .min(1)
        .max(4)
        .describe('Turns in the order they happened. One to four.'),
      { text: 'text' }
    ),
  })
  .strict();

/** A short exchange between a user, a model, and the host. */
export type SlideTranscriptNode = z.infer<typeof schema> & PrimitiveNode;
