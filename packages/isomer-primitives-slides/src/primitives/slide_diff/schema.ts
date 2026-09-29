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
import { codeDenseAfter } from '../../theme/components/code';
import { diffLineMaxLength, diffMaxLines } from '../../theme/components/diff';
import { slideDiffOps } from '../../theme/variants';
import { lineText } from '../authored_text';
import { crossRefine } from '../cross_field';

// Past this many UTF-16 units a line fits no panel, so it is refused before measuring.
const RAW_LINE_LIMIT = diffLineMaxLength(true) * 8;

const lineSchema = z
  .object({
    text: z
      .string()
      .max(RAW_LINE_LIMIT)
      .describe(
        'One line of source, indented with spaces rather than tabs. Use an empty string for a blank line.'
      ),
    op: z
      .enum(slideDiffOps)
      .describe(
        '`add` for a line the change introduced, `remove` for one it deleted. Leave it out for an unchanged context line.'
      )
      .optional(),
  })
  .strict();

export type SlideDiffLine = z.infer<typeof lineSchema>;

const isDense = (lines: readonly SlideDiffLine[]) =>
  lines.length > codeDenseAfter;

/** Zod schema for {@link SlideDiffNode}. */
export const schema = z
  .object({
    type: z.literal('slideDiff'),
    file: lineText()
      .describe(
        'Caption above the panel: the file, or what changed (e.g. `checkout.ts · before and after`).'
      )
      .optional(),
    language: lineText()
      .describe(
        'Language of the source, e.g. `ts`. The slide shows no syntax colors, and markdown fences the lines as `diff`.'
      )
      .optional(),
    lines: z
      .array(lineSchema)
      .min(1)
      .max(diffMaxLines)
      .describe(
        `The changed lines with a little unchanged context around them, in file order. 1 to ${diffMaxLines}; ${codeDenseAfter} or fewer stay at the larger size. A line holds ${diffLineMaxLength(false)} columns (${diffLineMaxLength(true)} past ${codeDenseAfter} lines), a wide glyph such as CJK or an emoji counting as two; a narrower column holds fewer, and a longer line is clipped.`
      ),
  })
  .strict()
  .check(
    crossRefine(
      ({ lines }) => !lines.some(({ text }) => hasLineTerminator(text)),
      {
        error:
          'one line per entry: split multi-line source into separate lines',
        path: ['lines'],
      }
    )
  )
  .check(
    crossRefine(({ lines }) => !lines.some(({ text }) => text.includes('\t')), {
      error: 'indent with spaces, not tabs',
      path: ['lines'],
    })
  )
  .check(
    crossRefine(
      ({ lines }) => {
        const max = diffLineMaxLength(isDense(lines));
        return lines.every(({ text }) => displayColumns(text, max) <= max);
      },
      {
        error: ({ input }) => {
          const { lines } = input as { lines: SlideDiffLine[] };
          const dense = isDense(lines)
            ? ` once there are more than ${codeDenseAfter} lines`
            : '';
          return `a line is wider than its panel: at most ${diffLineMaxLength(isDense(lines))} columns${dense}, a wide glyph counting as two`;
        },
        path: ['lines'],
      }
    )
  );

/** Lines of source with the ones a change added and removed marked. */
export type SlideDiffNode = z.infer<typeof schema> & PrimitiveNode;
