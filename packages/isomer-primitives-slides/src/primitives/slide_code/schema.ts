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

/** A panel's source, one entry per line. */
export const panelLines = ({ text }: Pick<SlideCodePanel, 'text'>): string[] =>
  text.split('\n');

/** Whether `text` is within its length and line caps, so a check that always runs may read it. */
const textInBounds = (text: unknown): text is string =>
  typeof text === 'string' &&
  text.length <= authoredTextMaxLength &&
  text.split('\n').length <= codeMaxLines;

/** The source field, with the width a line holds stated for `room`. */
export const sourceText = (room: string) =>
  z
    .string()
    .min(1)
    .max(authoredTextMaxLength)
    .describe(
      `Source, one line of source per line, indented with spaces rather than tabs. 1 to ${codeMaxLines} lines; while every panel has ${codeDenseAfter} or fewer, they stay at the larger size.${room ? ` ${room}` : ''}`
    );

export const fileField = () =>
  lineText()
    .describe(
      'Caption above the panel: a file name, or what the code is (e.g. `checkout.ts`).'
    )
    .optional();

export const languageField = () =>
  lineText()
    .describe(
      'Language of the source, e.g. `ts` or `json`. Sets the markdown fence; the slide shows no syntax colors.'
    )
    .optional();

export const lineNumbersField = () =>
  z
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
    .optional();

type PanelInput = Pick<SlideCodePanel, 'text' | 'lineNumbers'>;

/** The checks one panel's source and highlights hold to, on the object that holds them. */
export const panelChecks = [
  crossRefine<PanelInput>(
    ({ text }) =>
      typeof text !== 'string' ||
      text.length > authoredTextMaxLength ||
      text.split('\n').length <= codeMaxLines,
    {
      error: `at most ${codeMaxLines} lines`,
      path: ['text'],
      rule: `1 to ${codeMaxLines} lines`,
    }
  ),
  crossRefine<PanelInput>(
    ({ text }) =>
      !textInBounds(text) || !text.split('\n').some(hasLineTerminator),
    {
      error: 'separate lines with a line feed',
      path: ['text'],
      rule: 'one line of source per line',
    }
  ),
  crossRefine<PanelInput>(
    ({ text }) => !textInBounds(text) || !text.includes('\t'),
    {
      error: 'indent with spaces, not tabs',
      path: ['text'],
      rule: 'indented with spaces rather than tabs',
    }
  ),
  crossRefine<PanelInput>(
    ({ lineNumbers, text }) => {
      if (typeof lineNumbers !== 'object' || !textInBounds(text)) {
        return true;
      }
      const { start = 1, highlight } = lineNumbers;
      const ranges =
        highlight === undefined ? undefined : lineRanges(highlight);
      return (
        ranges === undefined ||
        rangesWithin(ranges, start, start + text.split('\n').length - 1)
      );
    },
    {
      error: 'each highlighted line must be a number the gutter shows',
      path: ['lineNumbers', 'highlight'],
      rule: 'each is a line of this panel',
    }
  ),
] as const;

/** One side of a trace; {@link SlideCodeNode} holds the same fields flat. */
export const panelSchema = z
  .object({
    file: fileField(),
    language: languageField(),
    text: sourceText(''),
    lineNumbers: lineNumbersField(),
  })
  .strict()
  .check(...panelChecks);

/** One panel of source: a {@link SlideCodeNode}, or one side of a trace. */
export type SlideCodePanel = z.infer<typeof panelSchema>;

/** Each line's gutter label, or `undefined` for a panel without line numbers. */
export const panelGutter = (panel: SlideCodePanel): string[] | undefined => {
  const { lineNumbers } = panel;
  if (!lineNumbers) {
    return undefined;
  }
  const start = lineNumbers === true ? 1 : (lineNumbers.start ?? 1);
  return gutterLabels(panelLines(panel).map((_, index) => start + index));
};

/** The indexes of the lines `lineNumbers.highlight` marks. */
export const panelHighlights = (panel: SlideCodePanel): ReadonlySet<number> => {
  const { lineNumbers } = panel;
  if (typeof lineNumbers !== 'object' || lineNumbers.highlight === undefined) {
    return new Set();
  }
  const { start = 1, highlight } = lineNumbers;
  const ranges = lineRanges(highlight) ?? [];
  return new Set(
    panelLines(panel).flatMap((_, index) =>
      inRanges(ranges, start + index) ? [index] : []
    )
  );
};

const isDense = (panels: readonly SlideCodePanel[]) =>
  panels.some((panel) => panelLines(panel).length > codeDenseAfter);

const lineLimit = (panels: readonly SlideCodePanel[]) =>
  codeLineMaxLength(panels.length === 2 ? 2 : 1, isDense(panels));

/** What a line holds in one panel, or in each of two, as a description states it. */
export const lineRoom = (panels: 1 | 2): string =>
  panels === 1
    ? `A line holds ${codeLineMaxLength(1, false)} columns in one panel (${codeLineMaxLength(1, true)} once it passes ${codeDenseAfter} lines), a wide glyph such as CJK or an emoji counting as two, less a line-number gutter; a narrower column holds fewer, and a longer line is clipped.`
    : `A line holds ${codeLineMaxLength(2, false)} columns in each of two panels (${codeLineMaxLength(2, true)} once a panel passes ${codeDenseAfter} lines), a wide glyph such as CJK or an emoji counting as two, less a line-number gutter; a narrower column holds fewer, and a longer line is clipped.`;

/** The width check over every panel a node draws, read off `panelsOf`. */
export const panelWidthCheck = <T>(
  panelsOf: (node: T) => readonly SlideCodePanel[],
  path: PropertyKey[],
  rule: string
) =>
  crossRefine<T>(
    (node) => {
      const panels = panelsOf(node);
      if (
        panels.length > 2 ||
        !panels.every(({ text }) => textInBounds(text))
      ) {
        return true;
      }
      return panels.every((panel) => {
        const max = lineLimit(panels) - gutterColumns(panelGutter(panel));
        return panelLines(panel).every(
          (line) => displayColumns(line, max) <= max
        );
      });
    },
    {
      error: ({ input }) => {
        const panels = panelsOf(input as T);
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
      path,
      rule,
    }
  );

/** Zod schema for {@link SlideCodeNode}. */
export const schema = z
  .object({
    type: z.literal('slideCode'),
    file: fileField(),
    language: languageField(),
    text: fromTextChildren(sourceText(lineRoom(1)), { dedent: true }),
    lineNumbers: lineNumbersField(),
  })
  .strict()
  .check(...panelChecks)
  .check(
    panelWidthCheck<SlideCodePanel>(
      (node) => [node],
      ['text'],
      `A line holds ${codeLineMaxLength(1, false)} columns in one panel`
    )
  );

/** Source code in one panel. */
export type SlideCodeNode = z.infer<typeof schema> & PrimitiveNode;
