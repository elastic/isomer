/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString, z } from '@elastic/isomer-sdk';

import { crossSuperRefine } from './cross_field';

/** One value in a non-multivalue cell. `null` is a missing value, never zero. */
export const scalarCellSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

export type ScalarCell = z.infer<typeof scalarCellSchema>;

export const cellSchema = z.union([
  scalarCellSchema,
  z.array(scalarCellSchema),
]);

/** A cell: one value, or an array of values in a `multivalue` column. */
export type Cell = z.infer<typeof cellSchema>;

export const COLUMN_TYPES = ['number', 'string', 'date', 'boolean'] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

export const COLUMN_ROLES = ['dimension', 'metric'] as const;

/**
 * `dimension` columns identify a row (buckets, categories, time); `metric`
 * columns measure it. Dimensions lead text summaries and are what a selection
 * targets.
 */
export type ColumnRole = (typeof COLUMN_ROLES)[number];

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const hexColorSchema = z
  .string()
  .regex(HEX_COLOR, { error: 'must be a #rgb, #rrggbb or #rrggbbaa color' })
  .describe('A `#rgb`, `#rrggbb` or `#rrggbbaa` color.');

export const CHROME_TOKENS = [
  'text',
  'textSubdued',
  'axis',
  'gridLine',
  'background',
  'border',
] as const;

export type ChromeToken = (typeof CHROME_TOKENS)[number];

export const colorValueSchema = z
  .union([
    z.strictObject({ light: hexColorSchema, dark: hexColorSchema }),
    z.strictObject({ token: z.enum(CHROME_TOKENS) }),
    z.strictObject({
      palette: z.literal('categorical'),
      index: z.int().min(0),
    }),
  ])
  .describe(
    'A color. Data colors are concrete for both schemes (`{ light, dark }`). `{ token }` is for chrome only: text, axes, grid lines, background, borders. `{ palette: "categorical", index }` picks from the default categorical palette, for charts authored with no palette of their own.'
  );

export type ColorValue = z.infer<typeof colorValueSchema>;

const numeralShape = {
  pattern: requiredString().describe(
    'A Numeral.js pattern, as Kibana field formats take it, such as `0,0.[000]`.'
  ),
  locale: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The Numeral.js locale Kibana formats numbers in (`format:number:defaultLocale`), such as `en` or `de`. Absent means `en`.'
    ),
  alwaysShowSign: z
    .boolean()
    .optional()
    .describe('Prefix `+` to positive values that do not round to zero.'),
  suffix: z
    .string()
    .optional()
    .describe('Text appended to the formatted value.'),
};

export const DURATION_UNITS = [
  'picoseconds',
  'nanoseconds',
  'microseconds',
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number];

export const DURATION_OUTPUT_UNITS = [
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
] as const;

export const portableFormatSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('number'), ...numeralShape }),
    z.strictObject({ kind: z.literal('percent'), ...numeralShape }),
    z.strictObject({ kind: z.literal('bytes'), ...numeralShape }),
    z.strictObject({ kind: z.literal('bits'), ...numeralShape }),
    z.strictObject({
      kind: z.literal('duration'),
      input: z
        .enum(DURATION_UNITS)
        .describe('The unit the raw value is stored in.'),
      output: z
        .union([
          z.enum(DURATION_OUTPUT_UNITS),
          z.literal('humanize'),
          z.literal('humanizePrecise'),
        ])
        .describe(
          'A unit to convert to, `humanize` for an approximate phrase such as "a few seconds", or `humanizePrecise` for the largest whole unit with decimals.'
        ),
      decimals: z.int().min(0).optional(),
      showSuffix: z.boolean().optional(),
      useShortSuffix: z.boolean().optional(),
      includeSpaceWithSuffix: z.boolean().optional(),
      suffix: numeralShape.suffix,
    }),
    z.strictObject({
      kind: z.literal('date'),
      pattern: requiredString().describe(
        'A Moment.js date pattern, as Kibana field formats take it, such as `MMM D, YYYY @ HH:mm:ss.SSS`.'
      ),
      timeZone: requiredString().describe(
        'The IANA time zone dates display in, such as `UTC` or `Europe/Paris`.'
      ),
    }),
    z.strictObject({ kind: z.literal('text') }),
  ])
  .describe(
    'How a column formats its values. Formats outside this set arrive as pre-rendered `data.display` strings with a `losses` entry.'
  );

export type PortableFormat = z.infer<typeof portableFormatSchema>;

export const columnSchema = z.strictObject({
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

export type ChartColumn = z.infer<typeof columnSchema>;

export const DATA_RULES = {
  uniqueIds: 'Column ids are unique.',
  rowWidth: 'Every row has exactly one cell per column, in column order.',
  cellType:
    'A cell holds its column type or null: a number in a `number` column, a string in a `string` column, a boolean in a `boolean` column, and epoch milliseconds or an ISO 8601 date-time string in a `date` column. Only a `multivalue` column holds arrays of those.',
  display: 'Each `display` key names a column and holds one string per row.',
} as const;

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

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
        (typeof value === 'string' &&
          ISO_DATE_TIME.test(value) &&
          !Number.isNaN(Date.parse(value)))
      );
  }
};

/** Whether `cell` is legal in `column`, per {@link DATA_RULES}`.cellType`. */
export const cellMatchesColumn = (
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
  display: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      'Pre-rendered strings per column id, one per row, for values whose format is outside the portable set. They replace the formatted value on every surface.'
    ),
});

export const chartDataSchema = chartDataObjectSchema
  .describe(DATA_DESCRIPTION)
  .check(
    crossSuperRefine<z.infer<typeof chartDataObjectSchema>>(
      ({ columns, rows, display }, context) => {
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
        for (const [id, strings] of Object.entries(display ?? {})) {
          if (!seen.has(id) || strings.length !== rows.length) {
            context.addIssue({
              code: 'custom',
              path: ['display', id],
              message: seen.has(id)
                ? `${DATA_RULES.display} It has ${strings.length} strings for ${rows.length} rows.`
                : `${DATA_RULES.display} No column is "${id}".`,
            });
          }
        }
      },
      [
        DATA_RULES.uniqueIds,
        DATA_RULES.rowWidth,
        DATA_RULES.cellType,
        DATA_RULES.display,
      ]
    )
  );

export type ChartData = z.infer<typeof chartDataSchema>;

export const BAND_RULE =
  'Each band with both bounds has `from` below `to`, and bands ascend without overlapping.';

export const colorBandSchema = z.strictObject({
  from: z
    .number()
    .optional()
    .describe('Inclusive lower bound. Absent means unbounded.'),
  to: z
    .number()
    .optional()
    .describe('Exclusive upper bound. Absent means unbounded.'),
  color: colorValueSchema,
});

export type ColorBand = z.infer<typeof colorBandSchema>;

const chartColorsObjectSchema = z.strictObject({
  byKey: z
    .record(z.string(), colorValueSchema)
    .optional()
    .describe(
      'Color per series or category key. Each chart states what its keys are.'
    ),
  bands: z
    .array(colorBandSchema)
    .optional()
    .describe(`Colors by value range. ${BAND_RULE}`),
});

export const chartColorsSchema = chartColorsObjectSchema
  .describe(
    'Colors resolved by whoever built the node. A renderer never picks a data color of its own.'
  )
  .check(
    crossSuperRefine<z.infer<typeof chartColorsObjectSchema>>(
      ({ bands }, context) => {
        let floor = -Infinity;
        (bands ?? []).forEach(({ from, to }, index) => {
          const low = from ?? -Infinity;
          const high = to ?? Infinity;
          if (low >= high || low < floor || (index > 0 && from === undefined)) {
            context.addIssue({
              code: 'custom',
              path: ['bands', index],
              message: BAND_RULE,
            });
          }
          floor = high;
        });
      },
      [BAND_RULE]
    )
  );

export type ChartColors = z.infer<typeof chartColorsSchema>;

const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const provenanceSchema = z
  .strictObject({
    kind: z.literal('kibana'),
    kibanaVersion: requiredString(),
    materializer: requiredString().describe(
      'The materializer that built the node, such as `lens`.'
    ),
    materializerVersion: z.int().min(1),
    spaceId: z.string().min(1).optional(),
    savedObjectType: z.string().min(1).optional(),
    savedObjectId: z.string().min(1).optional(),
    panelId: z.string().min(1).optional(),
    timeRange: z
      .strictObject({ from: isoDateTimeSchema, to: isoDateTimeSchema })
      .optional()
      .describe('The absolute time range the data was queried for.'),
    capturedAt: isoDateTimeSchema,
  })
  .describe(
    'Where the node came from, so a host can show when it was captured and materialize it again. Never rendered.'
  );

export type Provenance = z.infer<typeof provenanceSchema>;

export const LOSS_KINDS = ['dropped', 'approximated', 'prerendered'] as const;

export const lossSchema = z
  .strictObject({
    path: requiredString().describe(
      'Where in the source the loss is, such as `metrics[0].format`.'
    ),
    kind: z.enum(LOSS_KINDS),
    note: requiredString(),
  })
  .describe('Something the source had that this node drops or approximates.');

export type Loss = z.infer<typeof lossSchema>;

/** The fields every chart primitive shares. Spread into each chart's schema. */
export const chartCoreShape = {
  title: z.string().optional(),
  description: z
    .string()
    .optional()
    .describe('What the chart shows, for accessible and text surfaces.'),
  data: chartDataSchema,
  colors: chartColorsSchema.optional(),
  source: provenanceSchema.optional(),
  losses: z.array(lossSchema).optional(),
};

export const COLUMN_REF_RULE =
  'Every column reference names a column in `data.columns`.';

/** A reference to a column by id, checked against `data.columns` by the chart that holds it. */
export const columnRefSchema = z
  .string()
  .min(1)
  .describe(`A column id. ${COLUMN_REF_RULE}`);

export interface ColumnReference {
  path: (string | number)[];
  id: string;
  /** Types the reference accepts. Absent means any. */
  types?: readonly ColumnType[];
}

/** Adds an issue for each reference that names no column, or a column of a type it does not accept. */
export const checkColumnReferences = (
  data: { columns: readonly ChartColumn[] } | undefined,
  references: readonly ColumnReference[],
  context: z.core.$RefinementCtx<unknown>,
  typeRule: string
): void => {
  const byId = new Map(
    (data?.columns ?? []).map((column) => [column.id, column])
  );
  for (const { path, id, types } of references) {
    const column = byId.get(id);
    if (!column) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${COLUMN_REF_RULE} No column is "${id}".`,
      });
    } else if (types && !types.includes(column.type)) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${typeRule} Column "${id}" is \`${column.type}\`.`,
      });
    }
  }
};
