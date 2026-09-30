/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { figureText, lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const pointSchema = z
  .object({
    label: lineText().describe(
      'When or where the number was taken, in one to three words, e.g. `Last spring`. Rendered uppercase, except code. `code` and `**strong**` marks are allowed.'
    ),
    value: figureText()
      .describe(
        'The number as it should read, unit included, e.g. `26` or `4.2s`. Omit it when the number is not known yet: the slide shows a placeholder, never an invented value.'
      )
      .optional(),
  })
  .strict();

/** One side of a {@link SlideDeltaNode}. */
export type SlideDeltaPoint = z.infer<typeof pointSchema>;

/** Zod schema for {@link SlideDeltaNode}. */
export const schema = z
  .object({
    type: z.literal('slideDelta'),
    before: pointSchema.describe('The starting number, on the left.'),
    after: pointSchema.describe('The number now, on the right, in primary.'),
    change: figureText()
      .describe(
        'The difference as it should read, e.g. `+13` or `−40%`. Leave it out when either value is missing.'
      )
      .optional(),
    body: wrappedText().describe(
      'One sentence on what changed and why it matters. `code` and `**strong**` marks are allowed.'
    ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ before, after, change }) =>
        change === undefined ||
        (before.value !== undefined && after.value !== undefined),
      {
        error: 'change needs both values',
        path: ['change'],
        rule: 'change needs both values',
      }
    )
  );

/** One number before and after a change, with what the change means. */
export type SlideDeltaNode = z.infer<typeof schema> & PrimitiveNode;
