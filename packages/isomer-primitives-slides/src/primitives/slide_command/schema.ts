/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { commandMaxLength } from '../../theme/components/command';
import { crossRefine } from '../cross_field';

/** Zod schema for {@link SlideCommandNode}. */
export const schema = z
  .object({
    type: z.literal('slideCommand'),
    label: z
      .string()
      .min(1)
      .describe(
        'A few words above the panel saying what the command does, e.g. "Install".'
      )
      .optional(),
    command: z
      .string()
      .min(1)
      .max(commandMaxLength)
      .describe(
        `One shell command on one line, without the \`$\` prompt; the slide draws that. At most ${commandMaxLength} characters. It is sized to the full slide width, so do not put it in a slideSplit column.`
      ),
    highlightPrefix: z
      .string()
      .min(1)
      .describe(
        'The start of `command` to draw in primary, such as an environment variable the audience should notice. Must be a prefix of `command`.'
      )
      .optional(),
  })
  .strict()
  .check(
    crossRefine(({ command }) => !command.includes('\n'), {
      error: 'one line only: a multi-line command belongs in slideCode',
      path: ['command'],
    })
  )
  .check(
    crossRefine(
      ({ command, highlightPrefix }) =>
        highlightPrefix === undefined || command.startsWith(highlightPrefix),
      { error: 'highlightPrefix must start command', path: ['highlightPrefix'] }
    )
  );

/** One shell command the audience can run, on a single line. */
export type SlideCommandNode = z.infer<typeof schema> & PrimitiveNode;
