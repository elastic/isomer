/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { slideMatrixMarks } from '../../theme/variants';
import { lineText } from '../authored_text';
import { crossSuperRefine } from '../cross_field';
import { sizeField } from '../size';

export const matrixMaxColumns = 6;

const maxRows = 8;

const rowSchema = z
  .object({
    label: lineText().describe(
      'What the row rates, in one to three words, e.g. `Refunds`. `code` and `**strong**` marks are allowed.'
    ),
    marks: z
      .array(z.enum(slideMatrixMarks))
      .max(matrixMaxColumns)
      .describe(
        'One mark per column, left to right: `full` (yes), `partial`, or `none` (no).'
      ),
  })
  .strict();

/** One rated row of a {@link SlideMatrixNode}. */
export type SlideMatrixRow = z.infer<typeof rowSchema>;

/** Zod schema for {@link SlideMatrixNode}. */
export const schema = z
  .object({
    type: z.literal('slideMatrix'),
    columns: z
      .array(
        lineText().describe(
          'One short word, set in mono, e.g. `iOS`. `code` and `**strong**` marks are allowed.'
        )
      )
      .min(2)
      .max(matrixMaxColumns)
      .describe(`Column headings, left to right. 2 to ${matrixMaxColumns}.`),
    rows: z
      .array(rowSchema)
      .min(1)
      .max(maxRows)
      .describe(`Rows, top to bottom. 1 to ${maxRows}.`),
    highlight: z
      .number()
      .int()
      .min(0)
      .describe(
        'Zero-based index into `columns`, below their count, of the one to single out, such as the option you chose: its column draws in primary, its heading marked on every surface. Leave it out to weigh the columns evenly.'
      )
      .optional(),
    legend: z
      .boolean()
      .describe(
        'Show a key under the grid naming each mark in use. Defaults to true.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossSuperRefine(({ columns, rows, highlight }, context) => {
      if (highlight !== undefined && highlight >= columns.length) {
        context.addIssue({
          code: 'custom',
          message: `must be a column index below ${columns.length}`,
          path: ['highlight'],
        });
      }
      if (columns.length > matrixMaxColumns || rows.length > maxRows) {
        return;
      }
      rows.forEach(({ marks }, index) => {
        if (marks.length !== columns.length) {
          context.addIssue({
            code: 'custom',
            message: `every row needs one mark per column (${columns.length})`,
            path: ['rows', index, 'marks'],
          });
        }
      });
    })
  );

/** Yes, partial, or no marks for each row against each column. */
export type SlideMatrixNode = z.infer<typeof schema> & PrimitiveNode;
