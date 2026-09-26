/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { slideDiffOps } from '../../theme/variants';
import { crossRefine } from '../cross_field';

const lineSchema = z
  .object({
    text: z
      .string()
      .describe(
        'One line of source, with indentation kept. Use an empty string for a blank line.'
      ),
    op: z
      .enum(slideDiffOps)
      .describe(
        '`add` for a line the change introduced, `remove` for one it deleted. Leave it out for an unchanged context line.'
      )
      .optional(),
  })
  .strict();

/** One line of a {@link SlideDiffNode}. */
export type SlideDiffLine = z.infer<typeof lineSchema>;

/** Zod schema for {@link SlideDiffNode}. */
export const schema = z
  .object({
    type: z.literal('slideDiff'),
    file: z
      .string()
      .min(1)
      .describe(
        'Caption above the panel: the file, or what changed (e.g. `checkout.ts · before and after`).'
      )
      .optional(),
    language: z
      .string()
      .min(1)
      .describe(
        'Language of the source, e.g. `ts`. Kept with the node; the slide shows no syntax colors and markdown fences the lines as `diff`.'
      )
      .optional(),
    lines: z
      .array(lineSchema)
      .min(1)
      .max(14)
      .describe(
        'The changed lines with a little unchanged context around them, in file order. One to fourteen; ten or fewer stay at the larger size.'
      ),
  })
  .strict()
  .check(
    crossRefine(
      ({ lines }) => lines.every(({ text }) => !text.includes('\n')),
      {
        error:
          'one line per entry: split multi-line source into separate lines',
        path: ['lines'],
      }
    )
  );

/** Lines of source with the ones a change added and removed marked. */
export type SlideDiffNode = z.infer<typeof schema> & PrimitiveNode;
