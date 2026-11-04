/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import {
  chartColorsSchema,
  chartCoreShape,
  checkColumnReferences,
  colorValueSchema,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './core';
import { crossSuperRefine } from './cross_field';
import {
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
  interactionsSchemaFor,
} from './events';

export const DATA_TABLE_SUMMARIES = [
  'sum',
  'avg',
  'count',
  'min',
  'max',
] as const;

export type DataTableSummary = (typeof DATA_TABLE_SUMMARIES)[number];

export const DATA_TABLE_RULES = {
  uniqueColumns: 'Each data column is listed in `columns` at most once.',
  numberOnly: 'A `bar` decoration and a `summary` need a `number` column.',
} as const;

/** How a `byKey` color names a cell: its value as a string, `null` as "null". */
export const DATA_TABLE_KEY_RULE =
  'A `byKey` key is a cell value as a string: `null` as "null". A number inside a band takes the band’s color first.';

const decorationColors = chartColorsSchema.describe(
  `Colors by value range (\`bands\`), or by cell value (\`byKey\`). ${DATA_TABLE_KEY_RULE}`
);

const decorationSchema = z
  .discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z.enum(['text', 'background', 'badge']),
        colors: decorationColors,
      })
      .describe(
        'Colors the value, the whole cell, or a badge around the value.'
      ),
    z
      .strictObject({
        kind: z.literal('bar'),
        color: colorValueSchema
          .optional()
          .describe(
            'The fill for values `colors` does not color. Absent means the default bar color.'
          ),
        colors: decorationColors.optional(),
        min: z
          .number()
          .optional()
          .describe(
            'Where the bar starts. Absent means the column’s lowest value, or 0 when that is positive and every value is the same.'
          ),
        max: z
          .number()
          .optional()
          .describe(
            'Where the bar ends. Absent means the column’s highest value, or 0 when that is negative and every value is the same.'
          ),
        baseline: z
          .number()
          .optional()
          .describe('The value the fill grows from. Absent means 0.'),
      })
      .describe(
        'Draws each value as a bar beside its text, across `min` to `max`: swapped when inverted, and one wide when equal.'
      ),
  ])
  .describe(
    'How the column decorates its cells. Empty cells are never decorated.'
  );

const tableColumnSchema = z.strictObject({
  column: columnRefSchema.describe(
    `The data column shown here. ${COLUMN_REF_RULE}`
  ),
  alignment: z
    .enum(['left', 'center', 'right'])
    .optional()
    .describe(
      'Absent means right for a `number` column and left for any other; a bar is never centered, and is right there instead.'
    ),
  width: z.number().positive().optional().describe('Width in pixels.'),
  decoration: decorationSchema.optional(),
  summary: z
    .strictObject({
      kind: z.enum(DATA_TABLE_SUMMARIES),
      label: z
        .string()
        .optional()
        .describe(
          'Shown before the value. Absent means the kind’s name, such as "Sum"; empty shows the value alone.'
        ),
    })
    .optional()
    .describe(
      'A footer cell with the column’s sum, average, value count, minimum or maximum, over every non-empty value.'
    ),
});

export type DataTableColumn = z.infer<typeof tableColumnSchema>;

const DATA_TABLE_DESCRIPTION = [
  'A table of rows and columns, as Kibana’s Lens data table and Discover sessions draw them. Each row of `data` is one table row; the first `dimension` column shown is the row header.',
  ...Object.values(DATA_TABLE_RULES),
].join(' ');

const dataTableObjectSchema = z.object({
  type: z.literal('dataTable'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: interactionsSchemaFor(['cell'])
    .extend({
      initial: z
        .strictObject({
          sort: z
            .strictObject({
              column: columnRefSchema,
              direction: z.enum(['asc', 'desc']),
            })
            .optional()
            .describe('The column the rows start sorted by.'),
        })
        .optional()
        .describe('The starting view state, where the source persists one.'),
    })
    .optional()
    .describe(
      'What the table offers a reader. `cell` selects a `dimension` cell. With no `onEvent` from the host, nothing is offered and nothing is raised.'
    ),
  columns: z
    .array(tableColumnSchema)
    .min(1)
    .optional()
    .describe(
      'The columns shown, in order. Absent means every data column in data order. Columns left out are not drawn but stay in `data`.'
    ),
  pageSize: z
    .int()
    .min(1)
    .optional()
    .describe('Rows per page. Absent means one page of every row.'),
  density: z
    .enum(['compact', 'default', 'expanded'])
    .optional()
    .describe('Row spacing and type size. Absent means `default`.'),
});

export const dataTableSchema = dataTableObjectSchema
  .describe(DATA_TABLE_DESCRIPTION)
  .check(
    crossSuperRefine<z.infer<typeof dataTableObjectSchema>>(
      (node, context) => {
        const columns = node.columns ?? [];
        const references: ColumnReference[] = columns.map(
          ({ column }, index) => ({
            path: ['columns', index, 'column'],
            id: column,
          })
        );
        const sort = node.interactions?.initial?.sort;
        if (sort) {
          references.push({
            path: ['interactions', 'initial', 'sort', 'column'],
            id: sort.column,
          });
        }
        checkColumnReferences(
          node.data,
          references,
          context,
          DATA_TABLE_RULES.numberOnly
        );
        checkInteractions(node, context);

        const types = new Map(
          node.data.columns.map(({ id, type }) => [id, type])
        );
        const seen = new Set<string>();
        columns.forEach(({ column, decoration, summary }, index) => {
          if (seen.has(column)) {
            context.addIssue({
              code: 'custom',
              path: ['columns', index, 'column'],
              message: `${DATA_TABLE_RULES.uniqueColumns} "${column}" repeats.`,
            });
          }
          seen.add(column);
          const type = types.get(column);
          const bar = decoration?.kind === 'bar' ? decoration : undefined;
          if (type !== undefined && type !== 'number') {
            for (const [field, present] of [
              ['decoration', bar !== undefined],
              ['summary', summary !== undefined],
            ] as const) {
              if (present) {
                context.addIssue({
                  code: 'custom',
                  path: ['columns', index, field],
                  message: `${DATA_TABLE_RULES.numberOnly} Column "${column}" is \`${type}\`.`,
                });
              }
            }
          }
        });
      },
      [
        COLUMN_REF_RULE,
        DATA_TABLE_RULES.uniqueColumns,
        DATA_TABLE_RULES.numberOnly,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

export type DataTableNode = z.infer<typeof dataTableSchema> & PrimitiveNode;
