/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { slideBulletMarkers } from '../../theme/variants';
import { layoutCheckNote, lineText, wrappedText } from '../authored_text';

/** Zod schema for {@link SlideBulletListNode}. */
export const schema = z
  .object({
    type: z.literal('slideBulletList'),
    items: z
      .array(wrappedText())
      .min(1)
      .max(6)
      .describe(
        `Points, top to bottom, one short sentence each. 1 to 6. \`code\` and \`**strong**\` marks are allowed. Type does not step down, so long points, or six under a two-line heading and lede, can run past the slide; ${layoutCheckNote}.`
      ),
    label: lineText()
      .describe('Uppercase caption above the list, in a few words.')
      .optional(),
    marker: z
      .enum(slideBulletMarkers)
      .describe(
        'Marker beside each item: `dot` for neutral points, `check` for things done or included, `x` for things left out. Defaults to `dot`.'
      )
      .optional(),
  })
  .strict();

/** Short unordered points with a shared marker. */
export type SlideBulletListNode = z.infer<typeof schema> & PrimitiveNode;
