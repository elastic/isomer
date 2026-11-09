/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { colorValueSchema } from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import {
  brushInteractionsSchemaFor,
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
} from './events';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

/** The cross-field rules `heatmapSchema` states in its description, one sentence each. */
export const HEATMAP_RULES = {
  valueType: 'The `value` column is a `number` column.',
  singleValued: 'The `x`, `y` and `value` columns are not `multivalue`.',
  distinct: 'The `x`, `y` and `value` columns are three different columns.',
  uniqueCells: 'No two rows hold the same `x` cell and the same `y` cell.',
  interval: 'Only a `date` `x` column has an `x.interval`.',
  brushColumn: 'A `brush` column is the `x` column, and a `date` column.',
  bandsRange: 'A `bandsRange` needs `colors.bands`.',
} as const;

const HEATMAP_DESCRIPTION = [
  'A grid of cells colored by value, as Lens’s heat map draws it: one column per distinct `x` cell, one row per distinct `y` cell, and each cell colored by the `colors.bands` band its `value` falls in. A cell whose value is missing is left empty; a value in no band is drawn transparent. With no `colors.bands`, values take five temperature colors in equal steps from the smallest value to the largest, the last open above, as Lens’s default palette does. `colors.byKey` does not apply.',
  ...Object.values(HEATMAP_RULES),
].join(' ');

const sortSchema = z
  .enum(['asc', 'desc'])
  .optional()
  .describe(
    'Order positions by their cells: numbers by value, anything else alphabetically by its text, a missing cell last. Absent means the order the rows first show them. A `date` `x` axis is always in time order.'
  );

const orientationSchema = z
  .enum(['horizontal', 'vertical', 'angled'])
  .optional()
  .describe('How x labels are turned. Absent means `horizontal`.');

const axisShape = {
  title: z.string().optional().describe('Absent means no title.'),
  labels: z
    .boolean()
    .optional()
    .describe('Show the position labels. Absent means true.'),
};

const heatmapObjectSchema = z.object({
  type: z.literal('heatmap'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: brushInteractionsSchemaFor(
    ['cell'],
    z
      .strictObject({ column: columnRefSchema })
      .describe(
        `Select a range of time along the x axis. ${HEATMAP_RULES.brushColumn}`
      )
  )
    .optional()
    .describe(
      'What the chart offers a reader. `cell` selects a cell by its `x` and `y` cells; a `brush` selects a range of time along a `date` x axis. With no `onEvent` from the host, nothing is offered and nothing is raised.'
    ),
  x: z
    .strictObject({
      column: columnRefSchema.describe(
        `One column of cells per distinct value of this column. ${COLUMN_REF_RULE}`
      ),
      sort: sortSchema,
      interval: z
        .number()
        .positive()
        .optional()
        .describe(
          `The bucket width in milliseconds, from the date histogram that built the x column: each column of cells spans it. Absent means the smallest spacing between x values. ${HEATMAP_RULES.interval}`
        ),
    })
    .describe(
      'The horizontal axis. A `date` column with two or more instants, or with an `interval`, is a time axis whose columns span equal buckets; anything else is one column per distinct cell.'
    ),
  y: z
    .strictObject({
      column: columnRefSchema.describe(
        `One row of cells per distinct value of this column. ${COLUMN_REF_RULE}`
      ),
      sort: sortSchema,
    })
    .optional()
    .describe('The vertical axis, top first. Absent means one row of cells.'),
  value: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column whose values color the cells. ${HEATMAP_RULES.valueType} ${COLUMN_REF_RULE}`
      ),
    })
    .describe(`What colors each cell. ${HEATMAP_RULES.singleValued}`),
  bandsRange: z
    .enum(['absolute', 'percentage'])
    .optional()
    .describe(
      `Whether \`colors.bands\` bounds are values, or percentages from the smallest value (0) to the largest (100); where every value is the same, each takes the last band. Absent means \`absolute\`. ${HEATMAP_RULES.bandsRange}`
    ),
  cellLabels: z
    .boolean()
    .optional()
    .describe(
      'Write each cell’s value in it, where it fits. Absent means false.'
    ),
  axes: z
    .strictObject({
      x: z
        .strictObject({ ...axisShape, labelOrientation: orientationSchema })
        .optional(),
      y: z.strictObject(axisShape).optional(),
    })
    .optional(),
  gridLines: z
    .strictObject({
      width: z
        .number()
        .min(0)
        .optional()
        .describe('Pixels between cells. Absent means 1.'),
      color: colorValueSchema
        .optional()
        .describe('Absent means the grid-line chrome color.'),
    })
    .optional()
    .describe('The lines between cells.'),
  legend: z
    .strictObject({
      visibility: z
        .enum(['visible', 'hidden'])
        .optional()
        .describe(
          'The legend lists each band with its range. Absent means `visible`.'
        ),
      position: z
        .enum(['top', 'bottom', 'left', 'right'])
        .optional()
        .describe('Absent means `right`.'),
      maxLines: z
        .int()
        .min(1)
        .optional()
        .describe('Lines before a legend item truncates. Absent means 1.'),
      size: z.enum(['auto', 's', 'm', 'l', 'xl']).optional(),
    })
    .optional(),
});

type HeatmapInput = z.infer<typeof heatmapObjectSchema>;

/** A heat map: cells by `x` and `y`, colored by value. */
export const heatmapSchema = heatmapObjectSchema
  .describe(HEATMAP_DESCRIPTION)
  .check(
    crossSuperRefine<HeatmapInput>(
      (node, context) => {
        const references: ColumnReference[] = [
          { path: ['x', 'column'], id: node.x.column, single: true },
          ...(node.y
            ? [{ path: ['y', 'column'], id: node.y.column, single: true }]
            : []),
          {
            path: ['value', 'column'],
            id: node.value.column,
            types: ['number'] as const,
            single: true,
          },
        ];
        checkColumnReferences(node.data, references, context, {
          missing: COLUMN_REF_RULE,
          type: HEATMAP_RULES.valueType,
          single: HEATMAP_RULES.singleValued,
        });
        const seen = new Set<string>();
        for (const { path, id } of references) {
          if (seen.has(id)) {
            context.addIssue({
              code: 'custom',
              path,
              message: `${HEATMAP_RULES.distinct} "${id}" repeats.`,
            });
          }
          seen.add(id);
        }
        const indexOf = (id: string) =>
          node.data.columns.findIndex((column) => column.id === id);
        const xIndex = indexOf(node.x.column);
        const yIndex = node.y ? indexOf(node.y.column) : -1;
        const xType = node.data.columns[xIndex]?.type;
        if (node.x.interval !== undefined && xType !== 'date') {
          context.addIssue({
            code: 'custom',
            path: ['x', 'interval'],
            message: HEATMAP_RULES.interval,
          });
        }
        if (xIndex >= 0 && (!node.y || yIndex >= 0)) {
          const cells = new Map<string, number>();
          node.data.rows.forEach((row, index) => {
            const key = JSON.stringify([
              row[xIndex],
              yIndex >= 0 ? row[yIndex] : null,
            ]);
            const first = cells.get(key);
            if (first === undefined) {
              cells.set(key, index);
            } else {
              context.addIssue({
                code: 'custom',
                path: ['data', 'rows', index],
                message: `${HEATMAP_RULES.uniqueCells} Row ${index} repeats row ${first}.`,
              });
            }
          });
        }
        if (node.bandsRange !== undefined && !node.colors?.bands?.length) {
          context.addIssue({
            code: 'custom',
            path: ['bandsRange'],
            message: HEATMAP_RULES.bandsRange,
          });
        }
        checkInteractions(node, context, {
          brushColumns: xType === 'date' ? [node.x.column] : [],
          brushRule: HEATMAP_RULES.brushColumn,
          brushTypes: ['date'],
        });
      },
      [
        COLUMN_REF_RULE,
        HEATMAP_RULES.valueType,
        HEATMAP_RULES.singleValued,
        HEATMAP_RULES.distinct,
        HEATMAP_RULES.uniqueCells,
        HEATMAP_RULES.interval,
        HEATMAP_RULES.brushColumn,
        HEATMAP_RULES.bandsRange,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `heatmap` node. */
export type HeatmapNode = z.infer<typeof heatmapSchema> & PrimitiveNode;
