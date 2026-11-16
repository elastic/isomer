/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import {
  BANDS_RANGE_RULE,
  checkBandsRange,
  colorValueSchema,
  KEY_PART_RULE,
} from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import { chartDataSchema } from './data';
import {
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
  interactionsSchemaFor,
} from './events';
import { glyphSchema } from './icons';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

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
  bandsRange: BANDS_RANGE_RULE,
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
    showIcon: z
      .boolean()
      .optional()
      .describe(
        'Shows an arrow for the difference’s direction. Absent means true.'
      ),
    showValue: z
      .boolean()
      .optional()
      .describe(
        'Shows the secondary text beside the arrow: the difference when `to` is `primary`, else the secondary value. Absent means true.'
      ),
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
      orientation: z
        .enum(['horizontal', 'vertical'])
        .optional()
        .describe('The direction the bar fills in. Absent means `horizontal`.'),
    })
    .describe('A progress bar from zero to `max` behind the value.'),
  z
    .strictObject({
      kind: z.literal('trend'),
      data: chartDataSchema.describe(
        'The trend’s own table, apart from the metric’s `data`.'
      ),
      x: columnRefSchema.describe('The column along the trend line.'),
      y: columnRefSchema.describe('The column the trend line plots.'),
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
  value: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column holding the headline value. ${COLUMN_REF_RULE}`
      ),
      subtitle: z
        .string()
        .optional()
        .describe('Text under each tile’s title. Absent means none.'),
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
          `Whether band bounds are values, or percentages from 0 to the \`background\` bar’s \`max\`, across the range of \`breakdown\` tiles, or from 0 to twice a lone value. A tile in an empty range takes the first band. Absent means \`absolute\`. ${METRIC_RULES.bandsRange}`
        ),
      applyColorTo: z
        .enum(['value', 'background'])
        .optional()
        .describe('What the color paints. Absent means `background`.'),
    })
    .describe('The headline value of each tile, and its color.'),
  secondary: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column holding the secondary value. ${COLUMN_REF_RULE}`
      ),
      showLabel: z
        .boolean()
        .optional()
        .describe(
          'Shows the column’s label with the secondary value. Absent means false.'
        ),
      labelPlacement: z
        .enum(['before', 'after', 'tooltip'])
        .optional()
        .describe(
          'Where the label sits: `before` or `after` the value, or in a `tooltip` on it. Absent means `before`.'
        ),
      color: colorValueSchema
        .optional()
        .describe(
          'The secondary text’s color. Absent means the chart’s subdued text color, or a readable color on a colored background.'
        ),
      compare: metricCompareSchema.optional(),
    })
    .optional()
    .describe(
      'A second, smaller value on each tile, such as a previous period or a comparison.'
    ),
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
        .describe('Tiles per row before wrapping. Absent means 3.'),
    })
    .optional()
    .describe(
      'One tile per row of `data`, titled by a column. Absent means one tile.'
    ),
  layout: z
    .strictObject({
      density: z
        .enum(['compact', 'default'])
        .optional()
        .describe(
          '`compact` tightens each tile’s spacing. Absent means `default`.'
        ),
      icon: z
        .strictObject({
          name: glyphSchema,
          alignment: z
            .enum(['left', 'right'])
            .optional()
            .describe(
              'The side of the tile the icon sits on. Absent means `right`.'
            ),
        })
        .optional()
        .describe('A glyph drawn on every tile. Absent means none.'),
      valuePosition: z
        .enum(['top', 'middle', 'bottom'])
        .optional()
        .describe(
          'Where the value sits in its tile, with the title and subtitle taking the room left. Absent means `bottom`.'
        ),
      labelsAlignment: alignmentSchema
        .optional()
        .describe('How the title and subtitle align. Absent means `left`.'),
      valueAlignment: alignmentSchema
        .optional()
        .describe('How the value aligns. Absent means `right`.'),
      valueSizing: z
        .enum(['auto', 'fill'])
        .optional()
        .describe(
          '`fill` grows the value’s text to the room its tile has; `auto` keeps the renderer’s size for the tile. Absent means `auto`.'
        ),
      secondaryAlignment: alignmentSchema
        .optional()
        .describe('How the secondary value aligns. Absent means `right`.'),
    })
    .optional()
    .describe('How each tile arranges its text.'),
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
  checkBandsRange(
    { bandsRange: node.value.bandsRange, colors: node.colors },
    context,
    ['value', 'bandsRange']
  );
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
        METRIC_RULES.bandsRange,
        METRIC_RULES.trendBreakdown,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `metric` node. */
export type MetricNode = z.infer<typeof metricSchema> & PrimitiveNode;
