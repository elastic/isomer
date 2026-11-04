/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import {
  chartCoreShape,
  chartDataSchema,
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

export const METRIC_ICONS = [
  'alert',
  'asterisk',
  'bell',
  'bolt',
  'bug',
  'compute',
  'editor_comment',
  'flag',
  'globe',
  'heart',
  'map_marker',
  'pin',
  'popout',
  'sort_down',
  'sort_up',
  'star_empty',
  'tag',
  'temperature',
] as const;

export const METRIC_RULES = {
  columnType:
    'A bar `max` and a trend `y` are `number` columns; a trend `x` is a `date` or `number` column.',
  trendColumns:
    'Trend column references name a column in `background.data.columns`.',
  oneRow: 'Without a `breakdown`, `data` holds at most one row.',
  bands: 'A `bands` color needs `colors.bands`.',
  percentage:
    'Percentage bands need a `background` bar or a `breakdown`, which supply the maximum.',
  trendBreakdown: 'A trend `breakdown` needs a `breakdown` on the metric.',
} as const;

const alignmentSchema = z.enum(['left', 'center', 'right']);

export const metricCompareSchema = z
  .strictObject({
    to: z
      .enum(['baseline', 'primary'])
      .describe('Compare to a fixed `baseline`, or to the primary value.'),
    baseline: z
      .number()
      .optional()
      .describe(
        'The value compared to when `to` is `baseline`. Absent means 0.'
      ),
    showIcon: z.boolean().optional(),
    showValue: z.boolean().optional(),
    colors: z
      .strictObject({
        increase: colorValueSchema,
        decrease: colorValueSchema,
        neutral: colorValueSchema,
      })
      .describe(
        'Colors for a secondary value above, below and equal to what it is compared to.'
      ),
  })
  .describe('Shows the secondary value as a difference, colored by its sign.');

const backgroundSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({
      kind: z.literal('bar'),
      max: columnRefSchema.describe(
        `The column holding each tile's maximum. ${COLUMN_REF_RULE}`
      ),
      orientation: z.enum(['horizontal', 'vertical']).optional(),
    })
    .describe('A progress bar from zero to `max` behind the value.'),
  z
    .strictObject({
      kind: z.literal('trend'),
      data: chartDataSchema,
      x: columnRefSchema,
      y: columnRefSchema,
      breakdown: columnRefSchema
        .optional()
        .describe(
          "Matches each trend row to a tile by this column's value, equal to the metric breakdown value."
        ),
    })
    .describe(
      `A trend line behind the value, from its own table. ${METRIC_RULES.trendColumns}`
    ),
]);

const METRIC_DESCRIPTION = [
  'One or more metric tiles: a headline value with optional secondary value, progress bar or trend line. Each row of `data` is one tile.',
  ...Object.values(METRIC_RULES),
].join(' ');

const metricObjectSchema = z.object({
  type: z.literal('metric'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: interactionsSchemaFor(['tile']).optional(),
  value: z.strictObject({
    column: columnRefSchema.describe(
      `The column holding the headline value. ${COLUMN_REF_RULE}`
    ),
    subtitle: z.string().optional(),
    color: z
      .union([colorValueSchema, z.literal('bands')])
      .optional()
      .describe(
        'A static color, or `bands` to color by `colors.bands`. Absent means the default.'
      ),
    bandsRange: z
      .enum(['absolute', 'percentage'])
      .optional()
      .describe(
        'Whether band bounds are values, or percentages of the maximum. Absent means `absolute`.'
      ),
    applyColorTo: z
      .enum(['value', 'background'])
      .optional()
      .describe('What the color paints. Absent means `background`.'),
  }),
  secondary: z
    .strictObject({
      column: columnRefSchema,
      showLabel: z.boolean().optional(),
      labelPlacement: z.enum(['before', 'after', 'tooltip']).optional(),
      color: colorValueSchema.optional(),
      compare: metricCompareSchema.optional(),
    })
    .optional(),
  background: backgroundSchema.optional(),
  breakdown: z
    .strictObject({
      column: columnRefSchema.describe(
        "Each row's value in this column titles its tile."
      ),
      maxColumns: z
        .int()
        .min(1)
        .optional()
        .describe('Tiles per row before wrapping.'),
    })
    .optional(),
  layout: z
    .strictObject({
      density: z.enum(['compact', 'default']).optional(),
      icon: z
        .strictObject({
          name: z.enum(METRIC_ICONS),
          alignment: z.enum(['left', 'right']).optional(),
        })
        .optional(),
      valuePosition: z.enum(['top', 'middle', 'bottom']).optional(),
      labelsAlignment: alignmentSchema.optional(),
      valueAlignment: alignmentSchema.optional(),
      valueSizing: z.enum(['auto', 'fill']).optional(),
      secondaryAlignment: alignmentSchema.optional(),
    })
    .optional(),
});

export const metricSchema = metricObjectSchema
  .describe(METRIC_DESCRIPTION)
  .check(
    crossSuperRefine<z.infer<typeof metricObjectSchema>>(
      (node, context) => {
        const references: ColumnReference[] = [
          { path: ['value', 'column'], id: node.value.column },
        ];
        if (node.secondary) {
          references.push({
            path: ['secondary', 'column'],
            id: node.secondary.column,
          });
        }
        if (node.breakdown) {
          references.push({
            path: ['breakdown', 'column'],
            id: node.breakdown.column,
          });
        }
        if (node.background?.kind === 'bar') {
          references.push({
            path: ['background', 'max'],
            id: node.background.max,
            types: ['number'],
          });
        }
        checkColumnReferences(
          node.data,
          references,
          context,
          METRIC_RULES.columnType
        );
        checkInteractions(node, context);

        if (node.background?.kind === 'trend') {
          const { data, x, y, breakdown } = node.background;
          const trend: ColumnReference[] = [
            { path: ['background', 'x'], id: x, types: ['date', 'number'] },
            { path: ['background', 'y'], id: y, types: ['number'] },
          ];
          if (breakdown !== undefined) {
            trend.push({ path: ['background', 'breakdown'], id: breakdown });
          }
          for (const reference of trend) {
            const column = data.columns.find(({ id }) => id === reference.id);
            if (!column) {
              context.addIssue({
                code: 'custom',
                path: reference.path,
                message: `${METRIC_RULES.trendColumns} No trend column is "${reference.id}".`,
              });
            } else if (
              reference.types &&
              !reference.types.includes(column.type)
            ) {
              context.addIssue({
                code: 'custom',
                path: reference.path,
                message: `${METRIC_RULES.columnType} Column "${reference.id}" is \`${column.type}\`.`,
              });
            }
          }
          if (breakdown !== undefined && !node.breakdown) {
            context.addIssue({
              code: 'custom',
              path: ['background', 'breakdown'],
              message: METRIC_RULES.trendBreakdown,
            });
          }
        }

        if (!node.breakdown && node.data.rows.length > 1) {
          context.addIssue({
            code: 'custom',
            path: ['data', 'rows'],
            message: `${METRIC_RULES.oneRow} It holds ${node.data.rows.length}.`,
          });
        }
        if (node.value.color === 'bands' && !node.colors?.bands?.length) {
          context.addIssue({
            code: 'custom',
            path: ['value', 'color'],
            message: METRIC_RULES.bands,
          });
        }
        if (
          node.value.bandsRange === 'percentage' &&
          node.background?.kind !== 'bar' &&
          !node.breakdown
        ) {
          context.addIssue({
            code: 'custom',
            path: ['value', 'bandsRange'],
            message: METRIC_RULES.percentage,
          });
        }
      },
      [
        COLUMN_REF_RULE,
        METRIC_RULES.columnType,
        METRIC_RULES.trendColumns,
        METRIC_RULES.oneRow,
        METRIC_RULES.bands,
        METRIC_RULES.percentage,
        METRIC_RULES.trendBreakdown,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

export type MetricNode = z.infer<typeof metricSchema> & PrimitiveNode;
