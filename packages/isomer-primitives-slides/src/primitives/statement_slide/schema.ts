/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';

import { wrappedText } from '../authored_text';
import { sizeField } from '../size';

/** Zod schema for {@link StatementSlideNode}. */
export const schema = z
  .object({
    type: z.literal('statementSlide'),
    text: fromTextChildren(
      wrappedText().describe(
        'One short sentence, the slide’s whole point. Wrap the words that carry it in `**strong**`, which takes the `primary` tone. `code` and `**strong**` marks are allowed.'
      )
    ),
    size: sizeField(),
  })
  .strict();

/** One thesis sentence set large on its own slide. */
export type StatementSlideNode = z.infer<typeof schema> & PrimitiveNode;
