/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { KEY_PART_RULE } from './colors';
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

/** The shapes a `partitionChart` draws. */
export const PARTITION_SHAPES = [
  'pie',
  'donut',
  'treemap',
  'mosaic',
  'waffle',
] as const;

/** One of {@link PARTITION_SHAPES}. */
export type PartitionShape = (typeof PARTITION_SHAPES)[number];

/** The most `groups` each shape takes, as Lens allows. */
export const PARTITION_MAX_GROUPS: Readonly<Record<PartitionShape, number>> = {
  pie: 3,
  donut: 3,
  treemap: 2,
  mosaic: 2,
  waffle: 1,
};

/** The cross-field rules `partitionChartSchema` states in its description, one sentence each. */
export const PARTITION_RULES = {
  metricType: 'A `metrics` column is a `number` column.',
  singleValued: 'The `metrics` and `groups` columns are not `multivalue`.',
  distinct: 'A column appears at most once across `metrics` and `groups`.',
  groupCount:
    '`groups` holds at most 3 columns on a `pie` or `donut`, 2 on a `treemap` or `mosaic`, and 1 on a `waffle`.',
  mosaicMetric: 'A `mosaic` takes one metric.',
  donutHole: 'Only a `donut` has a `donutHole`.',
} as const;

/** What a `colors.byKey` key names in a `partitionChart`. */
export const PARTITION_KEY_RULE = `A \`colors.byKey\` key names a color category: the outermost group's cell, or on a \`mosaic\` with two groups the second group's cell; with no \`groups\`, a metric column id. ${KEY_PART_RULE}`;

const PARTITION_DESCRIPTION = [
  'Parts of a whole, as Lens’s pie, donut, treemap, mosaic and waffle charts draw them. Each `groups` column is one layer of slices, outermost first; each slice’s size is the sum of its rows’ `metrics` values. A missing or non-number value counts as 0, and any negative value leaves the chart empty with a note, as Lens does.',
  PARTITION_KEY_RULE,
  ...Object.values(PARTITION_RULES),
].join(' ');

const partitionChartObjectSchema = z.object({
  type: z.literal('partitionChart'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: interactionsSchemaFor(['slice'])
    .optional()
    .describe(
      'What the chart offers a reader. `slice` selects a slice or legend item, by the group cells on its path. With no `onEvent` from the host, nothing is offered and nothing is raised.'
    ),
  shape: z
    .enum(PARTITION_SHAPES)
    .describe(
      '`pie` and `donut` are rings of sectors, one ring per layer; `treemap` nests rectangles; `mosaic` splits columns by the first group and stacks the second within each; `waffle` fills a 10 × 10 grid of squares.'
    ),
  metrics: z
    .array(
      z.strictObject({
        column: columnRefSchema.describe(
          `The column whose values size the slices. ${PARTITION_RULES.metricType} ${COLUMN_REF_RULE}`
        ),
      })
    )
    .min(1)
    .describe(
      `What sizes the slices. Several metrics add one more, innermost, layer with a slice per metric, named by its column label. ${PARTITION_RULES.mosaicMetric}`
    ),
  groups: z
    .array(
      z.strictObject({
        column: columnRefSchema.describe(
          `One slice per distinct value of this column. ${COLUMN_REF_RULE}`
        ),
      })
    )
    .optional()
    .describe(
      `The layers of slices, outermost first. Absent or empty means one slice per metric. ${PARTITION_RULES.groupCount}`
    ),
  labels: z
    .strictObject({
      categories: z
        .enum(['auto', 'inside', 'hidden'])
        .optional()
        .describe(
          'Slice names. `auto` draws a name outside a pie or donut slice too small to hold it, with a line to the slice; `inside` draws names only where they fit. Absent means `auto`.'
        ),
      values: z
        .enum(['percent', 'value', 'hidden'])
        .optional()
        .describe(
          'What follows each slice name: its share of the whole, its value, or nothing. Absent means `percent`.'
        ),
      percentDecimals: z
        .int()
        .min(0)
        .max(10)
        .optional()
        .describe(
          'The most fraction digits a percentage shows; trailing zeros are dropped. Absent means 2.'
        ),
    })
    .optional(),
  donutHole: z
    .number()
    .gt(0)
    .lt(1)
    .optional()
    .describe(
      `The hole's radius as a share of the donut's. Absent means 0.3. ${PARTITION_RULES.donutHole}`
    ),
  legend: z
    .strictObject({
      visibility: z
        .enum(['auto', 'visible', 'hidden'])
        .optional()
        .describe(
          '`auto` shows the legend on a waffle, and on a pie or donut with more than one layer. Absent means `auto`.'
        ),
      position: z
        .enum(['top', 'bottom', 'left', 'right'])
        .optional()
        .describe('Absent means `right`.'),
      nested: z
        .boolean()
        .optional()
        .describe(
          'List every layer, each slice under its parent, rather than the outermost layer alone. Ignored on a waffle and on a chart with one layer. Absent means false.'
        ),
      maxLines: z
        .int()
        .min(1)
        .optional()
        .describe('Lines before a legend item truncates. Absent means 1.'),
      size: z.enum(['auto', 's', 'm', 'l', 'xl']).optional(),
      values: z
        .boolean()
        .optional()
        .describe(
          'Show each slice’s value beside its legend item. Absent means true on a waffle and false otherwise.'
        ),
    })
    .optional(),
});

type PartitionChartInput = z.infer<typeof partitionChartObjectSchema>;

/** A partition chart: pie, donut, treemap, mosaic or waffle slices of a whole. */
export const partitionChartSchema = partitionChartObjectSchema
  .describe(PARTITION_DESCRIPTION)
  .check(
    crossSuperRefine<PartitionChartInput>(
      (node, context) => {
        const groups = node.groups ?? [];
        const references: ColumnReference[] = [
          ...node.metrics.map(({ column }, index) => ({
            path: ['metrics', index, 'column'],
            id: column,
            types: ['number'] as const,
            single: true,
          })),
          ...groups.map(({ column }, index) => ({
            path: ['groups', index, 'column'],
            id: column,
            single: true,
          })),
        ];
        checkColumnReferences(node.data, references, context, {
          missing: COLUMN_REF_RULE,
          type: PARTITION_RULES.metricType,
          single: PARTITION_RULES.singleValued,
        });
        const seen = new Set<string>();
        for (const { path, id } of references) {
          if (seen.has(id)) {
            context.addIssue({
              code: 'custom',
              path,
              message: `${PARTITION_RULES.distinct} "${id}" repeats.`,
            });
          }
          seen.add(id);
        }
        const most = PARTITION_MAX_GROUPS[node.shape];
        if (groups.length > most) {
          context.addIssue({
            code: 'custom',
            path: ['groups'],
            message: `${PARTITION_RULES.groupCount} This \`${node.shape}\` has ${groups.length}.`,
          });
        }
        if (node.shape === 'mosaic' && node.metrics.length > 1) {
          context.addIssue({
            code: 'custom',
            path: ['metrics'],
            message: PARTITION_RULES.mosaicMetric,
          });
        }
        if (node.donutHole !== undefined && node.shape !== 'donut') {
          context.addIssue({
            code: 'custom',
            path: ['donutHole'],
            message: PARTITION_RULES.donutHole,
          });
        }
        checkInteractions(node, context);
      },
      [
        COLUMN_REF_RULE,
        PARTITION_RULES.metricType,
        PARTITION_RULES.singleValued,
        PARTITION_RULES.distinct,
        PARTITION_RULES.groupCount,
        PARTITION_RULES.mosaicMetric,
        PARTITION_RULES.donutHole,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `partitionChart` node. */
export type PartitionChartNode = z.infer<typeof partitionChartSchema> &
  PrimitiveNode;
