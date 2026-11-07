/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString, z } from '@elastic/isomer-sdk';

import { isoDateTimeEpoch } from '../iso_date_time';

import { crossSuperRefine } from './cross_field';
import { portableFormatSchema } from './format';

const scalarCellSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

/** One value in a non-multivalue cell. `null` is a missing value, never zero. */
export type ScalarCell = z.infer<typeof scalarCellSchema>;

/** A cell: one scalar, or an array of scalars for a multivalue column. */
export const cellSchema = z.union([
  scalarCellSchema,
  z.array(scalarCellSchema),
]);

/** A cell: one value, or an array of values in a `multivalue` column. */
export type Cell = z.infer<typeof cellSchema>;

const COLUMN_TYPES = ['number', 'string', 'date', 'boolean'] as const;

/** The kind of value a column's cells hold. */
export type ColumnType = (typeof COLUMN_TYPES)[number];

const COLUMN_ROLES = ['dimension', 'metric'] as const;

/**
 * `dimension` columns identify a row (buckets, categories, time); `metric`
 * columns measure it. Dimensions lead text summaries and are what a selection
 * targets.
 */
export type ColumnRole = (typeof COLUMN_ROLES)[number];

const columnSchema = z.strictObject({
  id: requiredString().describe(
    'Stable within the node. Every other field refers to the column by this id.'
  ),
  label: z.string().describe('What the column is called on every surface.'),
  type: z.enum(COLUMN_TYPES),
  role: z.enum(COLUMN_ROLES),
  format: portableFormatSchema.optional(),
  multivalue: z
    .literal(true)
    .optional()
    .describe('Cells hold arrays of values.'),
  source: z
    .unknown()
    .optional()
    .describe(
      'Opaque to Isomer and never rendered. A host keeps what it needs to act on a selection here, such as Kibana `Datatable` column meta.'
    ),
});

/** A column of `data`: its identity, type, role and format. */
export type ChartColumn = z.infer<typeof columnSchema>;

/** The rules `chartDataSchema` states, one sentence each. */
export const DATA_RULES = {
  uniqueIds: 'Column ids are unique.',
  rowWidth: 'Every row has exactly one cell per column, in column order.',
  cellType:
    'A cell holds its column type or null: a number in a `number` column, a string in a `string` column, a boolean in a `boolean` column, and epoch milliseconds or an ISO 8601 date-time string with a UTC offset (`Z` or `+hh:mm`) in a `date` column. Only a `multivalue` column holds arrays of those.',
  display: 'Each `display` key names a column and holds one string per row.',
} as const;

const scalarMatches = (type: ColumnType, value: ScalarCell): boolean => {
  if (value === null) {
    return true;
  }
  switch (type) {
    case 'number':
      return typeof value === 'number';
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return (
        typeof value === 'number' ||
        (typeof value === 'string' && isoDateTimeEpoch(value) !== undefined)
      );
  }
};

const cellMatchesColumn = (
  column: Pick<ChartColumn, 'type' | 'multivalue'>,
  cell: Cell
): boolean =>
  Array.isArray(cell)
    ? column.multivalue === true &&
      cell.every((value) => scalarMatches(column.type, value))
    : scalarMatches(column.type, cell);

const DATA_DESCRIPTION = [
  'Typed columnar data, as the source table holds it: rows are never reordered, and a selection refers to them by index.',
  ...Object.values(DATA_RULES),
].join(' ');

const chartDataObjectSchema = z.strictObject({
  columns: z.array(columnSchema).min(1),
  rows: z.array(z.array(cellSchema)),
  source: z
    .unknown()
    .optional()
    .describe(
      'Opaque table-level meta, never rendered, such as Kibana `Datatable` meta.'
    ),
  missing: z
    .strictObject({
      null: z
        .string()
        .optional()
        .describe('A missing (`null`) cell. Absent means `(null)`.'),
      empty: z
        .string()
        .optional()
        .describe('An empty string. Absent means `(blank)`.'),
      nan: z
        .string()
        .optional()
        .describe(
          'A number-like value that is not a number. Absent means `NaN`.'
        ),
    })
    .optional()
    .describe('The text for cells a format cannot show.'),
  display: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      'Pre-rendered strings per column id, one per row, for values whose format is outside the portable set. They replace the formatted value on every surface.'
    ),
});

type ChartDataInput = z.infer<typeof chartDataObjectSchema>;
type Issues = z.core.$RefinementCtx<ChartDataInput>;

const checkUniqueIds = (
  { columns }: ChartDataInput,
  context: Issues
): Set<string> => {
  const seen = new Set<string>();
  columns.forEach(({ id }, index) => {
    if (seen.has(id)) {
      context.addIssue({
        code: 'custom',
        path: ['columns', index, 'id'],
        message: `${DATA_RULES.uniqueIds} "${id}" repeats.`,
      });
    }
    seen.add(id);
  });
  return seen;
};

const checkRows = ({ columns, rows }: ChartDataInput, context: Issues) => {
  rows.forEach((row, rowIndex) => {
    if (row.length !== columns.length) {
      context.addIssue({
        code: 'custom',
        path: ['rows', rowIndex],
        message: `${DATA_RULES.rowWidth} This row has ${row.length} cells for ${columns.length} columns.`,
      });
      return;
    }
    row.forEach((cell, columnIndex) => {
      const column = columns[columnIndex];
      if (column && !cellMatchesColumn(column, cell)) {
        context.addIssue({
          code: 'custom',
          path: ['rows', rowIndex, columnIndex],
          message: `${DATA_RULES.cellType} Column "${column.id}" is \`${column.type}\`${column.multivalue ? ' and multivalue' : ''}.`,
        });
      }
    });
  });
};

const checkDisplay = (
  { rows, display }: ChartDataInput,
  columnIds: ReadonlySet<string>,
  context: Issues
) => {
  for (const [id, strings] of Object.entries(display ?? {})) {
    const isColumn = columnIds.has(id);
    if (!isColumn || strings.length !== rows.length) {
      context.addIssue({
        code: 'custom',
        path: ['display', id],
        message: isColumn
          ? `${DATA_RULES.display} It has ${strings.length} strings for ${rows.length} rows.`
          : `${DATA_RULES.display} No column is "${id}".`,
      });
    }
  }
};

/** Typed columnar data, shared by every chart, with the rules in {@link DATA_RULES}. */
export const chartDataSchema = chartDataObjectSchema
  .describe(DATA_DESCRIPTION)
  .check(
    crossSuperRefine<ChartDataInput>(
      (data, context) => {
        const columnIds = checkUniqueIds(data, context);
        checkRows(data, context);
        checkDisplay(data, columnIds, context);
      },
      [
        DATA_RULES.uniqueIds,
        DATA_RULES.rowWidth,
        DATA_RULES.cellType,
        DATA_RULES.display,
      ]
    )
  );

/** The table a chart draws: columns, rows, and optional pre-rendered strings. */
export type ChartData = z.infer<typeof chartDataSchema>;
