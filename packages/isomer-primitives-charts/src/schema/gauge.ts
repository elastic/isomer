/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import { linkSchema } from './events';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

/** The shapes a `gauge` draws. */
export const GAUGE_SHAPES = [
  'horizontalBullet',
  'verticalBullet',
  'semiCircle',
  'arc',
  'circle',
] as const;

/** One of {@link GAUGE_SHAPES}. */
export type GaugeShape = (typeof GAUGE_SHAPES)[number];

/** The cross-field rules `gaugeSchema` states in its description, one sentence each. */
export const GAUGE_RULES = {
  numberColumns:
    'The `value`, `min`, `max` and `goal` columns are single-valued `number` columns.',
  bandsRange: 'A `bandsRange` needs `colors.bands`.',
} as const;

const GAUGE_DESCRIPTION = [
  'One value against a scale from `min` to `max`, as Lens’s gauge draws it: a horizontal or vertical bullet, a semicircle, an arc or a circle, with an optional goal marker and the scale colored by `colors.bands`. It reads the first row whose `value` is a number. Without `colors.bands` the scale is one neutral color. Nothing on a gauge is selectable. `colors.byKey` does not apply.',
  ...Object.values(GAUGE_RULES),
].join(' ');

const boundSchema = (what: string) =>
  z
    .strictObject({
      column: columnRefSchema.describe(`The column holding ${what}.`),
    })
    .optional();

const gaugeObjectSchema = z.object({
  type: z.literal('gauge'),
  ...chartCoreShape,
  interactions: z
    .strictObject({ link: linkSchema.optional() })
    .optional()
    .describe('A static link. A gauge offers nothing to select.'),
  shape: z
    .enum(GAUGE_SHAPES)
    .describe(
      '`horizontalBullet` and `verticalBullet` are straight scales with the value as a bar; `semiCircle`, `arc` (two thirds of a circle) and `circle` are round scales with the value as an arc.'
    ),
  value: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column whose value the gauge shows. ${COLUMN_REF_RULE}`
      ),
    })
    .describe('What the gauge shows.'),
  min: boundSchema('the start of the scale').describe(
    'The start of the scale. Absent means 0, or 10 below the value (or `max`) where either is at most 0, as Lens does.'
  ),
  max: boundSchema('the end of the scale').describe(
    'The end of the scale. Absent means the value, the goal and the start of the scale rounded up to a readable number, as Lens does.'
  ),
  goal: boundSchema('the goal').describe(
    'A marker on the scale, drawn where it falls between `min` and `max`.'
  ),
  bandsRange: z
    .enum(['absolute', 'percentage'])
    .optional()
    .describe(
      `Whether \`colors.bands\` bounds are values, or percentages of the scale from \`min\` (0) to \`max\` (100). Absent means \`absolute\`. ${GAUGE_RULES.bandsRange}`
    ),
  ticks: z
    .enum(['auto', 'bands', 'hidden'])
    .optional()
    .describe(
      '`auto` lets the engine place ticks; `bands` puts them at the band edges, leaving out any within a tenth of the scale of its neighbor; `hidden` draws none. Absent means `auto`.'
    ),
  labels: z
    .strictObject({
      major: z
        .union([z.string(), z.literal(false)])
        .optional()
        .describe(
          'The gauge’s title. Absent means the value column’s label; false means none.'
        ),
      minor: z.string().optional().describe('A subtitle under it.'),
    })
    .optional(),
});

type GaugeInput = z.infer<typeof gaugeObjectSchema>;

/** A gauge: one value on a scale, as a bullet or a round dial. */
export const gaugeSchema = gaugeObjectSchema.describe(GAUGE_DESCRIPTION).check(
  crossSuperRefine<GaugeInput>(
    (node, context) => {
      const references: ColumnReference[] = (
        ['value', 'min', 'max', 'goal'] as const
      ).flatMap((field) => {
        const column = node[field]?.column;
        return column === undefined
          ? []
          : [
              {
                path: [field, 'column'],
                id: column,
                types: ['number'] as const,
                single: true,
              },
            ];
      });
      checkColumnReferences(node.data, references, context, {
        missing: COLUMN_REF_RULE,
        type: GAUGE_RULES.numberColumns,
      });
      if (node.bandsRange !== undefined && !node.colors?.bands?.length) {
        context.addIssue({
          code: 'custom',
          path: ['bandsRange'],
          message: GAUGE_RULES.bandsRange,
        });
      }
    },
    [COLUMN_REF_RULE, GAUGE_RULES.numberColumns, GAUGE_RULES.bandsRange]
  )
);

/** A validated `gauge` node. */
export type GaugeNode = z.infer<typeof gaugeSchema> & PrimitiveNode;
