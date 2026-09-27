/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { hasLineTerminator } from '../../render/marks';
import { codeDenseAfter, codeLineMaxLength } from '../../theme/components/code';
import { crossRefine } from '../cross_field';

const panelSchema = z
  .object({
    file: z
      .string()
      .min(1)
      .describe(
        'Caption above the panel: a file name, or what the code is (e.g. `checkout.ts`).'
      )
      .optional(),
    language: z
      .string()
      .min(1)
      .describe(
        'Language of this panel, e.g. `ts` or `json`. Sets the markdown fence; the slide shows no syntax colors.'
      )
      .optional(),
    lines: z
      .array(z.string())
      .min(1)
      .max(16)
      .describe(
        'Source, one entry per line, with indentation kept. Use an empty string for a blank line. One to sixteen lines; ten or fewer stay at the larger size.'
      ),
    highlightLines: z
      .array(z.number().int().positive())
      .min(1)
      .describe(
        '1-based line numbers to mark with a tinted band. Other lines stay at full strength.'
      )
      .optional(),
  })
  .strict()
  .check(
    crossRefine(({ lines }) => !lines.some(hasLineTerminator), {
      error: 'one line per entry: split multi-line source into separate lines',
      path: ['lines'],
    })
  )
  .check(
    crossRefine(
      ({ highlightLines, lines }) =>
        highlightLines === undefined ||
        highlightLines.every((line) => line <= lines.length),
      {
        error: 'highlightLines must exist in lines',
        path: ['highlightLines'],
      }
    )
  );

/** One panel of a {@link SlideCodeNode}. */
export type SlideCodePanel = z.infer<typeof panelSchema>;

/** Zod schema for {@link SlideCodeNode}. */
export const schema = z
  .object({
    type: z.literal('slideCode'),
    panels: z
      .array(panelSchema)
      .min(1)
      .max(2)
      .describe(
        `One panel, or two side by side with an arrow between them to trace a value from one file to the next. Two panels need the full slide width; do not put them in a slideSplit column. A line holds ${codeLineMaxLength(1, false)} characters in one panel and ${codeLineMaxLength(2, false)} in each of two (${codeLineMaxLength(1, true)} and ${codeLineMaxLength(2, true)} past ${codeDenseAfter} lines); a narrower column holds fewer, and a longer line is clipped.`
      ),
  })
  .strict()
  .check(
    crossRefine(
      ({ panels }) => {
        const dense = panels.some(({ lines }) => lines.length > codeDenseAfter);
        const max = codeLineMaxLength(panels.length === 2 ? 2 : 1, dense);
        return panels.every(({ lines }) =>
          lines.every((line) => line.length <= max)
        );
      },
      {
        error: `a line is wider than its panel: at most ${codeLineMaxLength(1, false)} characters in one panel, ${codeLineMaxLength(2, false)} in each of two`,
        path: ['panels'],
      }
    )
  );

/** Source code in one panel, or two joined by an arrow. */
export type SlideCodeNode = z.infer<typeof schema> & PrimitiveNode;
