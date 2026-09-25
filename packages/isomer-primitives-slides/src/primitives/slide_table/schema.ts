/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

const maxRows = 12;

const rowsSchema = z.array(z.array(z.string()));

const groupSchema = z
  .object({
    label: z
      .string()
      .min(1)
      .describe('Short uppercase label over the group’s rows.'),
    rows: rowsSchema.min(1).describe('The group’s rows, one cell per column.'),
  })
  .strict();

/** A labeled run of rows in a {@link SlideTableNode}. */
export type SlideTableGroup = z.infer<typeof groupSchema>;

/** Zod schema for {@link SlideTableNode}. */
export const schema = z
  .object({
    type: z.literal('slideTable'),
    label: z
      .string()
      .min(1)
      .describe('Short uppercase label above the table.')
      .optional(),
    columns: z
      .array(z.string().min(1))
      .min(1)
      .max(6)
      .describe('Column headings, left to right. One to six.'),
    rowHeaders: z
      .boolean()
      .describe(
        'Set the first cell of every row in bold, as that row’s name. Defaults to false.'
      )
      .optional(),
    rows: rowsSchema
      .min(1)
      .max(maxRows)
      .describe(
        'Body rows, one cell per column, short phrases or numbers. One to twelve. Give either `rows` or `groups`.'
      )
      .optional(),
    groups: z
      .array(groupSchema)
      .min(1)
      .max(maxRows)
      .describe(
        'Rows split under labels, e.g. required and optional packages. Twelve rows at most across all groups. Give either `rows` or `groups`.'
      )
      .optional(),
  })
  .strict()
  .superRefine(({ columns, groups, rows }, context) => {
    if ((rows === undefined) === (groups === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'give exactly one of rows or groups',
        path: [rows === undefined ? 'rows' : 'groups'],
      });
      return;
    }
    const checkRows = (
      body: readonly (readonly string[])[],
      path: (string | number)[]
    ) =>
      body.forEach((row, index) => {
        if (row.length !== columns.length) {
          context.addIssue({
            code: 'custom',
            message: `every row needs one cell per column (${columns.length})`,
            path: [...path, index],
          });
        }
      });
    if (rows) {
      checkRows(rows, ['rows']);
    }
    if (groups) {
      groups.forEach((group, index) =>
        checkRows(group.rows, ['groups', index, 'rows'])
      );
      const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
      if (total > maxRows) {
        context.addIssue({
          code: 'custom',
          message: `at most ${maxRows} rows across all groups`,
          path: ['groups'],
        });
      }
    }
  });

/** Headed grid of short text cells, optionally in labeled groups. */
export type SlideTableNode = z.infer<typeof schema> & PrimitiveNode;

/** A table's rows by group; `rows` reads as one unlabeled group. */
export const tableGroups = ({
  groups,
  rows,
}: Pick<SlideTableNode, 'groups' | 'rows'>): ReadonlyArray<{
  label?: string;
  rows: readonly (readonly string[])[];
}> => groups ?? [{ rows: rows ?? [] }];
