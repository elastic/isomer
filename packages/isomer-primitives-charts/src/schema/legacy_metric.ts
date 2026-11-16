/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { BANDS_RANGE_RULE, checkBandsRange } from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
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

/** The cross-field rules `legacyMetricSchema` states in its description, one sentence each. */
export const LEGACY_METRIC_RULES = {
  distinct:
    'Each `metrics` column is named once, and the `breakdown` column is not one of them.',
  oneRow: 'Without a `breakdown`, `data` holds at most one row.',
  bandsRange: BANDS_RANGE_RULE,
} as const;

/** The type steps of Lens's legacy metric, smallest first. */
export const LEGACY_METRIC_SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'] as const;

const LEGACY_METRIC_DESCRIPTION = [
  'Large values with a label above or below each, as Lens’s legacy metric and the aggregation-based metric visualization draw them: one tile per `metrics` column per row, centered and wrapped across the chart, each shrunk to fit it down to three tenths of its size. A tile’s label is its column’s label, after the row’s `breakdown` cell and " - " with a `breakdown`.',
  'With `colors.bands`, each tile of a `number` column is colored by the band its value falls in; a tile of any other column, or with no value, is not colored. A lone tile’s background color fills the chart. `colors.byKey` is not read.',
  ...Object.values(LEGACY_METRIC_RULES),
].join(' ');

const legacyMetricObjectSchema = z.object({
  type: z.literal('legacyMetric'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: interactionsSchemaFor(['tile'])
    .optional()
    .describe(
      'What the chart offers a reader. `tile` selects a tile, by its `breakdown` cell when there is one. With no `onEvent` from the host, nothing is offered and nothing is raised.'
    ),
  metrics: z
    .array(
      z.strictObject({
        column: columnRefSchema.describe(
          `A column whose values the tiles show. ${COLUMN_REF_RULE}`
        ),
      })
    )
    .min(1)
    .describe(
      'The values, in tile order: every row of the first column, then of the next.'
    ),
  breakdown: z
    .strictObject({
      column: columnRefSchema.describe(
        "Each row's cell in this column, as displayed, leads its tiles' labels."
      ),
    })
    .optional()
    .describe('Splits the values into one tile per row.'),
  size: z
    .enum(LEGACY_METRIC_SIZES)
    .optional()
    .describe(
      'The type size, as Lens’s: labels at EUI’s `xs` to `xxl` font sizes (12 to 32 pixels) and values at 24, 40, 50, 60, 80 and 96 pixels. Absent means `m`.'
    ),
  labelPosition: z
    .enum(['top', 'bottom'])
    .optional()
    .describe('Where the label sits. Absent means `top`.'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .optional()
    .describe(
      'How the value and label align with each other within a tile. Absent means `left`.'
    ),
  showLabels: z
    .boolean()
    .optional()
    .describe('Whether labels are shown. Absent means true.'),
  applyColorTo: z
    .enum(['value', 'background'])
    .optional()
    .describe(
      'What a `colors.bands` color paints: the value’s text, or the tile’s background, with its text in a color that reads on it. Absent means `background`.'
    ),
  bandsRange: z
    .enum(['absolute', 'percentage'])
    .optional()
    .describe(
      `Whether band bounds are values, or percentages of the range a column’s values span: from its least to its greatest, or for a lone value from 0 to twice it (from -50 to 100 for 0). Absent means \`absolute\`. ${LEGACY_METRIC_RULES.bandsRange}`
    ),
});

type LegacyMetricInput = z.infer<typeof legacyMetricObjectSchema>;
type Issues = z.core.$RefinementCtx<LegacyMetricInput>;

const checkDistinct = (node: LegacyMetricInput, context: Issues) => {
  const seen = new Set<string>();
  node.metrics.forEach(({ column }, index) => {
    if (seen.has(column)) {
      context.addIssue({
        code: 'custom',
        path: ['metrics', index, 'column'],
        message: LEGACY_METRIC_RULES.distinct,
      });
    }
    seen.add(column);
  });
  if (node.breakdown && seen.has(node.breakdown.column)) {
    context.addIssue({
      code: 'custom',
      path: ['breakdown', 'column'],
      message: LEGACY_METRIC_RULES.distinct,
    });
  }
};

/** A legacy metric: large values with labels, as Lens's legacy metric draws them. */
export const legacyMetricSchema = legacyMetricObjectSchema
  .describe(LEGACY_METRIC_DESCRIPTION)
  .check(
    crossSuperRefine<LegacyMetricInput>(
      (node, context) => {
        const references: ColumnReference[] = [
          ...node.metrics.map(({ column }, index) => ({
            path: ['metrics', index, 'column'],
            id: column,
          })),
          ...(node.breakdown
            ? [{ path: ['breakdown', 'column'], id: node.breakdown.column }]
            : []),
        ];
        checkColumnReferences(node.data, references, context, {
          missing: COLUMN_REF_RULE,
          type: COLUMN_REF_RULE,
        });
        checkDistinct(node, context);
        if (!node.breakdown && node.data.rows.length > 1) {
          context.addIssue({
            code: 'custom',
            path: ['data', 'rows'],
            message: `${LEGACY_METRIC_RULES.oneRow} It holds ${node.data.rows.length}.`,
          });
        }
        checkBandsRange(node, context);
        checkInteractions(node, context);
      },
      [
        COLUMN_REF_RULE,
        LEGACY_METRIC_RULES.distinct,
        LEGACY_METRIC_RULES.oneRow,
        LEGACY_METRIC_RULES.bandsRange,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `legacyMetric` node. */
export type LegacyMetricNode = z.infer<typeof legacyMetricSchema> &
  PrimitiveNode;
