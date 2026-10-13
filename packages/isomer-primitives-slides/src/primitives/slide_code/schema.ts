/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { hasLineTerminator } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import {
  codeDenseAfter,
  codeLineMaxLength,
  codeMaxLines,
} from '../../theme/components/code';
import { authoredTextMaxLength, lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { gutterColumns, gutterLabels } from '../line_gutter';
import {
  inRanges,
  lineRangeOrder,
  lineRanges,
  lineRangeText,
  rangesWithin,
} from '../line_ranges';
import { sourceLines } from '../source_text';

/** Whether `lines` is within its count and length caps, so a check that always runs may read it. */
const linesInBounds = (lines: readonly unknown[]): boolean =>
  lines.length <= codeMaxLines &&
  lines.every(
    (line) => typeof line === 'string' && line.length <= authoredTextMaxLength
  );

const panelSchema = z
  .object({
    file: lineText()
      .describe(
        'Caption above the panel: a file name, or what the code is (e.g. `checkout.ts`).'
      )
      .optional(),
    language: lineText()
      .describe(
        'Language of this panel, e.g. `ts` or `json`. Sets the markdown fence; the slide shows no syntax colors.'
      )
      .optional(),
    lines: z
      .array(z.string().max(authoredTextMaxLength))
      .min(1)
      .max(codeMaxLines)
      .describe(
        `Source, one entry per line, indented with spaces rather than tabs. Use an empty string for a blank line. 1 to ${codeMaxLines} lines; while every panel has ${codeDenseAfter} or fewer, they stay at the larger size.`
      ),
    lineNumbers: z
      .union([
        z.boolean(),
        z.strictObject({
          start: z
            .number()
            .int()
            .nonnegative()
            .describe('The number of the first line. Defaults to 1.')
            .optional(),
          highlight: lineRangeText()
            .describe(
              `Lines to mark with a tinted band, as numbers and ranges such as \`2, 5-7\`, ${lineRangeOrder}. They are the numbers the gutter shows, so \`start\` shifts them, and each is a line of this panel. Other lines stay at full strength.`
            )
            .optional(),
        }),
      ])
      .describe(
        'Numbers each line in a gutter: `true`, or `{ start, highlight }` to start past 1 or mark lines. The gutter takes columns from every line.'
      )
      .optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ lines }) => !linesInBounds(lines) || !lines.some(hasLineTerminator),
      {
        error:
          'one line per entry: split multi-line source into separate lines',
        path: ['lines'],
        rule: 'Source, one entry per line',
      }
    )
  )
  .check(
    crossRefine(
      ({ lines }) =>
        !linesInBounds(lines) || !lines.some((line) => line.includes('\t')),
      {
        error: 'indent with spaces, not tabs',
        path: ['lines'],
        rule: 'indented with spaces rather than tabs',
      }
    )
  )
  .check(
    crossRefine(
      ({ lineNumbers, lines }) => {
        if (typeof lineNumbers !== 'object') {
          return true;
        }
        const { start = 1, highlight } = lineNumbers;
        const ranges =
          highlight === undefined ? undefined : lineRanges(highlight);
        return (
          ranges === undefined ||
          lines.length > codeMaxLines ||
          rangesWithin(ranges, start, start + lines.length - 1)
        );
      },
      {
        error: 'each highlighted line must be a number the gutter shows',
        path: ['lineNumbers', 'highlight'],
        rule: 'each is a line of this panel',
      }
    )
  );

export type SlideCodePanel = z.infer<typeof panelSchema>;

/** Each line's gutter label, or `undefined` for a panel without line numbers. */
export const panelGutter = ({
  lineNumbers,
  lines,
}: SlideCodePanel): string[] | undefined => {
  if (!lineNumbers) {
    return undefined;
  }
  const start = lineNumbers === true ? 1 : (lineNumbers.start ?? 1);
  return gutterLabels(lines.map((_, index) => start + index));
};

/** The indexes of the lines `lineNumbers.highlight` marks. */
export const panelHighlights = ({
  lineNumbers,
  lines,
}: SlideCodePanel): ReadonlySet<number> => {
  if (typeof lineNumbers !== 'object' || lineNumbers.highlight === undefined) {
    return new Set();
  }
  const { start = 1, highlight } = lineNumbers;
  const ranges = lineRanges(highlight) ?? [];
  return new Set(
    lines.flatMap((_, index) =>
      inRanges(ranges, start + index) ? [index] : []
    )
  );
};

const isDense = (panels: SlideCodePanel[]) =>
  panels.some(({ lines }) => lines.length > codeDenseAfter);

const lineLimit = (panels: SlideCodePanel[]) =>
  codeLineMaxLength(panels.length === 2 ? 2 : 1, isDense(panels));

/** Zod schema for {@link SlideCodeNode}. */
export const schema = z
  .object({
    type: z.literal('slideCode'),
    panels: fromChildren(
      'codePanel',
      z
        .array(panelSchema)
        .min(1)
        .max(2)
        .describe(
          `One panel, or two side by side with an arrow between them to trace a value from one file to the next. Two panels need the full slide width; do not put them in a slideSplitLayout column. A line holds ${codeLineMaxLength(1, false)} columns in one panel and ${codeLineMaxLength(2, false)} in each of two (${codeLineMaxLength(1, true)} and ${codeLineMaxLength(2, true)} once a panel passes ${codeDenseAfter} lines), a wide glyph such as CJK or an emoji counting as two; a narrower column holds fewer, and a longer line is clipped.`
        ),
      {
        propsSchema: z.strictObject({
          ...panelSchema.shape,
          lines: panelSchema.shape.lines.optional(),
        }),
        toItem: ({ children, ...panel }) => ({
          ...panel,
          ...(panel.lines === undefined && children !== undefined
            ? { lines: sourceLines(children) }
            : {}),
        }),
      }
    ),
  })
  .strict()
  .check(
    crossRefine(
      ({ panels }) => {
        if (
          panels.length > 2 ||
          !panels.every(({ lines }) => linesInBounds(lines))
        ) {
          return true;
        }
        return panels.every((panel) => {
          const max = lineLimit(panels) - gutterColumns(panelGutter(panel));
          return panel.lines.every((line) => displayColumns(line, max) <= max);
        });
      },
      {
        error: ({ input }) => {
          const { panels } = input as { panels: SlideCodePanel[] };
          const where =
            panels.length === 2 ? 'in each of two panels' : 'in one panel';
          const dense = isDense(panels)
            ? ` once a panel passes ${codeDenseAfter} lines`
            : '';
          const gutter = panels.some(({ lineNumbers }) => lineNumbers)
            ? ', less its line-number gutter'
            : '';
          return `a line is wider than its panel: at most ${lineLimit(panels)} columns ${where}${dense}${gutter}, a wide glyph counting as two`;
        },
        path: ['panels'],
        rule: `A line holds ${codeLineMaxLength(1, false)} columns in one panel`,
      }
    )
  );

/** Source code in one panel, or two joined by an arrow. */
export type SlideCodeNode = z.infer<typeof schema> & PrimitiveNode;
