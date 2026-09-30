/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { hasLineTerminator } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import {
  command as commandTheme,
  commandMaxColumns,
} from '../../theme/components/command';
import { authoredTextMaxLength, lineText } from '../authored_text';
import { crossRefine } from '../cross_field';

/** Whether `text` is within its length cap, so a check that always runs may read it. */
const inBounds = (text: string): boolean =>
  text.length <= authoredTextMaxLength;

/** Zod schema for {@link SlideCommandNode}. */
export const schema = z
  .object({
    type: z.literal('slideCommand'),
    label: lineText()
      .describe(
        'A few words above the panel saying what the command does, e.g. "Install".'
      )
      .optional(),
    command: lineText().describe(
      `One shell command on one line, without the \`${commandTheme.prompt.value}\` prompt; the slide draws that. Separate words with spaces rather than tabs. It holds ${commandMaxColumns} columns on a full-width slide, a wide glyph such as CJK or an emoji counting as two; a narrower column holds fewer, and a longer command is clipped.`
    ),
    highlightPrefix: lineText()
      .describe(
        'The start of `command` to mark, such as an environment variable the audience should notice. Must be a prefix of `command`.'
      )
      .optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ command }) => !inBounds(command) || !hasLineTerminator(command),
      {
        error: 'one line only: a multi-line command belongs in slideCode',
        path: ['command'],
        rule: 'One shell command on one line',
      }
    )
  )
  .check(
    crossRefine(
      ({ command }) => !inBounds(command) || !command.includes('\t'),
      {
        error: 'separate words with spaces, not tabs',
        path: ['command'],
        rule: 'Separate words with spaces rather than tabs.',
      }
    )
  )
  .check(
    crossRefine(
      ({ command }) =>
        !inBounds(command) ||
        displayColumns(command, commandMaxColumns) <= commandMaxColumns,
      {
        error: `wider than the slide: at most ${commandMaxColumns} columns, a wide glyph counting as two`,
        path: ['command'],
        rule: `It holds ${commandMaxColumns} columns on a full-width slide`,
      }
    )
  )
  .check(
    crossRefine(
      ({ command, highlightPrefix }) =>
        highlightPrefix === undefined ||
        !inBounds(command) ||
        !inBounds(highlightPrefix) ||
        command.startsWith(highlightPrefix),
      {
        error: 'highlightPrefix must start command',
        path: ['highlightPrefix'],
        rule: 'Must be a prefix of `command`.',
      }
    )
  );

export type SlideCommandNode = z.infer<typeof schema> & PrimitiveNode;
