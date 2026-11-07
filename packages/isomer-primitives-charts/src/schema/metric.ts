/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { colorValueSchema, KEY_PART_RULE } from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import { chartDataSchema } from './data';
import {
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
  interactionsSchemaFor,
} from './events';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

// The icons the Lens API format's metric accepts.
const METRIC_ICONS = [
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

/** The cross-field rules `metricSchema` states in its description, one sentence each. */
export const METRIC_RULES = {
  columnType:
    'A bar `max` and a trend `y` are `number` columns; a trend `x` is a `date` or `number` column.',
  operands:
    'A `compare` secondary column is a single-valued `number` column, as is the headline `value` column when `background` is a bar or `color` is `bands`.',
  trendColumns:
    'Trend column references name a column in `background.data.columns`.',
  oneRow: 'Without a `breakdown`, `data` holds at most one row.',
  bands: 'A `bands` color needs `colors.bands`.',
  trendBreakdown: 'A trend `breakdown` needs a `breakdown` on the metric.',
} as const;

const alignmentSchema = z.enum(['left', 'center', 'right']);

const metricCompareSchema = z
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
        'Colors by the difference’s sign. To a `baseline`, the difference is the secondary minus the baseline; to the `primary`, the primary minus the secondary.'
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

const METRIC_KEY_RULE = `A \`colors.byKey\` key names a tile by its \`breakdown\` cell, and applies only with a \`breakdown\`. ${KEY_PART_RULE}`;

const METRIC_DESCRIPTION = [
  'One or more metric tiles: a headline value with optional secondary value, progress bar or trend line. Each row of `data` is one tile.',
  METRIC_KEY_RULE,
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
        'Whether band bounds are values, or percentages from 0 to the `background` bar’s `max`, across the range of `breakdown` tiles, or from 0 to twice a lone value. A tile in an empty range takes the first band. Absent means `absolute`.'
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

type MetricInput = z.infer<typeof metricObjectSchema>;
type Issues = z.core.$RefinementCtx<MetricInput>;

const operand = (path: string[], id: string): ColumnReference => ({
  path,
  id,
  types: ['number'],
  single: true,
  rule: METRIC_RULES.operands,
});

// The columns of `data` the node names. A column that takes part in arithmetic
// (a comparison, a progress bar or bands) must be a single-valued number.
const dataReferences = (node: MetricInput): ColumnReference[] => {
  const valueIsOperand =
    node.background?.kind === 'bar' || node.value.color === 'bands';
  const references: ColumnReference[] = [
    valueIsOperand
      ? operand(['value', 'column'], node.value.column)
      : { path: ['value', 'column'], id: node.value.column },
  ];
  if (node.secondary) {
    const path = ['secondary', 'column'];
    references.push(
      node.secondary.compare
        ? operand(path, node.secondary.column)
        : { path, id: node.secondary.column }
    );
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
  return references;
};

const checkTrend = (
  node: MetricInput,
  trend: Extract<NonNullable<MetricInput['background']>, { kind: 'trend' }>,
  context: Issues
) => {
  const { data, x, y, breakdown } = trend;
  const references: ColumnReference[] = [
    { path: ['background', 'x'], id: x, types: ['date', 'number'] },
    { path: ['background', 'y'], id: y, types: ['number'] },
    ...(breakdown === undefined
      ? []
      : [{ path: ['background', 'breakdown'], id: breakdown }]),
  ];
  checkColumnReferences(data, references, context, {
    missing: METRIC_RULES.trendColumns,
    type: METRIC_RULES.columnType,
    noun: 'trend column',
  });
  if (breakdown !== undefined && !node.breakdown) {
    context.addIssue({
      code: 'custom',
      path: ['background', 'breakdown'],
      message: METRIC_RULES.trendBreakdown,
    });
  }
};

const checkBands = (node: MetricInput, context: Issues) => {
  if (node.value.color === 'bands' && !node.colors?.bands?.length) {
    context.addIssue({
      code: 'custom',
      path: ['value', 'color'],
      message: METRIC_RULES.bands,
    });
  }
};

/** A metric: one headline value per tile, with optional secondary value, progress bar or trend. */
export const metricSchema = metricObjectSchema
  .describe(METRIC_DESCRIPTION)
  .check(
    crossSuperRefine<MetricInput>(
      (node, context) => {
        checkColumnReferences(node.data, dataReferences(node), context, {
          missing: COLUMN_REF_RULE,
          type: METRIC_RULES.columnType,
        });
        checkInteractions(node, context);
        if (node.background?.kind === 'trend') {
          checkTrend(node, node.background, context);
        }
        if (!node.breakdown && node.data.rows.length > 1) {
          context.addIssue({
            code: 'custom',
            path: ['data', 'rows'],
            message: `${METRIC_RULES.oneRow} It holds ${node.data.rows.length}.`,
          });
        }
        checkBands(node, context);
      },
      [
        COLUMN_REF_RULE,
        METRIC_RULES.columnType,
        METRIC_RULES.operands,
        METRIC_RULES.trendColumns,
        METRIC_RULES.oneRow,
        METRIC_RULES.bands,
        METRIC_RULES.trendBreakdown,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `metric` node. */
export type MetricNode = z.infer<typeof metricSchema> & PrimitiveNode;
