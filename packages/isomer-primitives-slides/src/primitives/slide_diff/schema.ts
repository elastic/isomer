/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';

import { hasLineTerminator } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { codeDenseAfter } from '../../theme/components/code';
import { diffLineMaxLength, diffMaxLines } from '../../theme/components/diff';
import type { SlideDiffOp } from '../../theme/variants';
import { authoredTextMaxLength, lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { gutterColumns, gutterLabels } from '../line_gutter';
import {
  inRanges,
  type LineRange,
  lineRangeOrder,
  lineRanges,
  lineRangeText,
  rangesOverlap,
  rangesWithin,
} from '../line_ranges';

/** One line of a diff as it draws: its text, and whether the change added or removed it. */
export interface SlideDiffLine {
  text: string;
  op?: SlideDiffOp;
}

const bodyLines = (text: string): string[] => text.split('\n');

/** Whether `text` is within its length and line caps, so a check that always runs may read it. */
const bodyInBounds = (text: unknown): text is string =>
  typeof text === 'string' &&
  text.length <= authoredTextMaxLength &&
  bodyLines(text).length <= diffMaxLines;

const rangesOf = (ranges: string | undefined): LineRange[] =>
  (ranges === undefined ? undefined : lineRanges(ranges)) ?? [];

const isDense = (text: string) => bodyLines(text).length > codeDenseAfter;

const rangeInBody = (field: 'add' | 'remove') =>
  crossRefine<{
    text: string;
    add?: string | undefined;
    remove?: string | undefined;
  }>(
    (node) =>
      !bodyInBounds(node.text) ||
      rangesWithin(rangesOf(node[field]), 1, bodyLines(node.text).length),
    {
      error: 'each changed line must be a line of the body',
      path: [field],
      rule: 'Each is a line of the body',
    }
  );

const lineNumbersSchema = z
  .union([
    z.boolean(),
    z.strictObject({
      start: z
        .number()
        .int()
        .nonnegative()
        .describe('The number of the first line. Defaults to 1.')
        .optional(),
    }),
  ])
  .describe(
    'Numbers the lines of the file after the change in a gutter: `true`, or `{ start }` to start past 1. A removed line takes no number. The gutter takes columns from every line.'
  );

const rangeField = (change: string) =>
  lineRangeText()
    .describe(
      `Lines the change ${change}, as numbers and ranges such as \`2, 5-7\`, ${lineRangeOrder}, counting the lines of the body from 1, removed ones included. Each is a line of the body, and no line is both added and removed; every other line is unchanged context.`
    )
    .optional();

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
    text: fromTextChildren(
      z
        .string()
        .min(1)
        .max(authoredTextMaxLength)
        .describe(
          `The changed lines with a little unchanged context around them, in file order, one line of source per line, indented with spaces rather than tabs. 1 to ${diffMaxLines} lines; ${codeDenseAfter} or fewer stay at the larger size. A line holds ${diffLineMaxLength(false)} columns (${diffLineMaxLength(true)} past ${codeDenseAfter} lines), a wide glyph such as CJK or an emoji counting as two, less a line-number gutter; a narrower column holds fewer, and a longer line is clipped.`
        ),
      { dedent: true }
    ),
    remove: rangeField('deleted'),
    add: rangeField('introduced'),
    lineNumbers: lineNumbersSchema.optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ text }) =>
        typeof text !== 'string' ||
        text.length > authoredTextMaxLength ||
        bodyLines(text).length <= diffMaxLines,
      {
        error: `at most ${diffMaxLines} lines`,
        path: ['text'],
        rule: `1 to ${diffMaxLines} lines`,
      }
    )
  )
  .check(
    crossRefine(
      ({ text }) =>
        !bodyInBounds(text) || !bodyLines(text).some(hasLineTerminator),
      {
        error: 'separate lines with a line feed',
        path: ['text'],
        rule: 'one line of source per line',
      }
    )
  )
  .check(
    crossRefine(({ text }) => !bodyInBounds(text) || !text.includes('\t'), {
      error: 'indent with spaces, not tabs',
      path: ['text'],
      rule: 'indented with spaces rather than tabs',
    })
  )
  .check(rangeInBody('remove'))
  .check(rangeInBody('add'))
  .check(
    crossRefine(
      ({ remove, add }) => !rangesOverlap(rangesOf(remove), rangesOf(add)),
      {
        error: 'a line cannot be both added and removed',
        path: ['add'],
        rule: 'no line is both added and removed',
      }
    )
  )
  .check(
    crossRefine(
      (node) => {
        if (!bodyInBounds(node.text)) {
          return true;
        }
        const gutter = diffGutter(node);
        const max =
          diffLineMaxLength(
            isDense(node.text),
            undefined,
            gutter !== undefined
          ) - gutterColumns(gutter);
        return bodyLines(node.text).every(
          (line) => displayColumns(line, max) <= max
        );
      },
      {
        error: ({ input }) => {
          const { text, lineNumbers } = input as SlideDiffNode;
          const dense = isDense(text)
            ? ` once there are more than ${codeDenseAfter} lines`
            : '';
          const gutter = lineNumbers ? ', less its line-number gutter' : '';
          return `a line is wider than its panel: at most ${diffLineMaxLength(isDense(text), undefined, Boolean(lineNumbers))} columns${dense}${gutter}, a wide glyph counting as two`;
        },
        path: ['text'],
        rule: `A line holds ${diffLineMaxLength(false)} columns`,
      }
    )
  );

/** Lines of source with the ones a change added and removed marked. */
export type SlideDiffNode = z.infer<typeof schema> & PrimitiveNode;

/** Each body line with the change `add` and `remove` mark on it. */
export const diffLines = ({
  text,
  add,
  remove,
}: Pick<SlideDiffNode, 'text' | 'add' | 'remove'>): SlideDiffLine[] => {
  const added = rangesOf(add);
  const removed = rangesOf(remove);
  return bodyLines(text).map((line, index) => {
    const op = inRanges(removed, index + 1)
      ? 'remove'
      : inRanges(added, index + 1)
        ? 'add'
        : undefined;
    return op ? { text: line, op } : { text: line };
  });
};

/** Each line's gutter label, numbering the file after the change; `undefined` without line numbers. */
export const diffGutter = (
  node: Pick<SlideDiffNode, 'text' | 'add' | 'remove' | 'lineNumbers'>
): string[] | undefined => {
  const { lineNumbers } = node;
  if (!lineNumbers) {
    return undefined;
  }
  let next = lineNumbers === true ? 1 : (lineNumbers.start ?? 1);
  return gutterLabels(
    diffLines(node).map(({ op }) => (op === 'remove' ? undefined : next++))
  );
};
