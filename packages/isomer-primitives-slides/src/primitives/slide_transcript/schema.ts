/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren, textFromChildren } from '@elastic/isomer-sdk/author';

import {
  slideTranscriptFormats,
  slideTranscriptRoles,
} from '../../theme/variants';
import { authoredTextMaxLength, lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';

import { turnLines } from './lines';

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
    text: wrappedText().describe(
      'What was said. Keep it to a sentence or a short line of code. Line breaks are kept; blank lines at either end are dropped, and a turn of only blank lines is refused.'
    ),
  })
  .strict()
  .check(
    crossRefine(
      ({ text }) =>
        text.length > authoredTextMaxLength || turnLines(text).length > 0,
      {
        error: 'a turn says something: text is blank',
        path: ['text'],
        rule: 'a turn of only blank lines is refused',
      }
    )
  );

export type SlideTranscriptTurn = z.infer<typeof turnSchema>;

type SlideTurnProps = Omit<SlideTranscriptTurn, 'text'> &
  Partial<Pick<SlideTranscriptTurn, 'text'>> & { children?: ReactNode };

/** Zod schema for {@link SlideTranscriptNode}. */
export const schema = z
  .object({
    type: z.literal('slideTranscript'),
    label: lineText()
      .describe(
        'Short label above the conversation, set in capitals, saying what the exchange shows.'
      )
      .optional(),
    turns: fromChildren(
      'slideTurn',
      z
        .array(turnSchema)
        .min(1)
        .max(4)
        .describe('Turns in the order they happened. 1 to 4.'),
      {
        text: 'text',
        propsSchema: z.strictObject({
          ...turnSchema.shape,
          text: turnSchema.shape.text.optional(),
        }),
        // Keeps the line breaks the default copy would collapse.
        toItem: ({ children, ...turn }: SlideTurnProps) => ({
          ...turn,
          ...(turn.text === undefined && children !== undefined
            ? {
                text: textFromChildren(children, { collapseWhitespace: false }),
              }
            : {}),
        }),
      }
    ),
  })
  .strict();

/** A short exchange between a user, a model, and the host. */
export type SlideTranscriptNode = z.infer<typeof schema> & PrimitiveNode;
