/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';

/** Zod schema for {@link SlideStatNode}. */
export const schema = z
  .object({
    type: z.literal('slideStat'),
    value: lineText()
      .describe(
        'The number as it should read, e.g. `3.4` or `40%`. Omit it when the number is not known yet: the slide shows a placeholder, never an invented value.'
      )
      .optional(),
    unit: lineText()
      .describe('Unit after the value, e.g. `KB` or `ms`. Requires `value`.')
      .optional(),
    body: wrappedText().describe(
      'One or two sentences saying what the number shows and why it matters. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict()
  .check(
    crossRefine(
      ({ value, unit }) => unit === undefined || value !== undefined,
      { error: 'unit needs a value', path: ['unit'] }
    )
  );

/** One headline number beside the sentence that explains it, as a band under the body. */
export type SlideStatNode = z.infer<typeof schema> & PrimitiveNode;
