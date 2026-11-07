/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { crossSuperRefine } from './cross_field';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const hexColorSchema = z
  .string()
  .regex(HEX_COLOR, { error: 'must be a #rgb, #rrggbb or #rrggbbaa color' })
  .describe('A `#rgb`, `#rrggbb` or `#rrggbbaa` color.');

const CHROME_TOKENS = [
  'text',
  'textSubdued',
  'axis',
  'gridLine',
  'background',
  'border',
] as const;

/**
 * A color, resolved by whoever built the node: concrete for both schemes,
 * a chrome token, or an index into the default categorical palette.
 */
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

/** A color for one scheme pair, a chrome token, or a categorical palette index. */
export type ColorValue = z.infer<typeof colorValueSchema>;

/**
 * How a cell becomes part of a `colors.byKey` key. Escaping keeps keys
 * unambiguous: a missing cell and the string "null" differ, and a part holding
 * ":" cannot be mistaken for two.
 */
export const KEY_PART_RULE =
  'A key part is the value as a string with each `\\` and `:` preceded by `\\`; a missing (null) cell is the key part `\\null`, and a multivalue cell is `\\` followed by the key part of its JSON text, such as `\\["a"]`; no string produces either.';

/** The rule `chartColorsSchema` states for `colors.bands`. */
export const BAND_RULE =
  'Each band with both bounds has `from` below `to`, and bands ascend without overlapping.';

const colorBandSchema = z.strictObject({
  from: z
    .number()
    .optional()
    .describe('Inclusive lower bound. Absent means unbounded.'),
  to: z
    .number()
    .optional()
    .describe(
      'Exclusive upper bound, except on the last band, which includes it. Absent means unbounded.'
    ),
  color: colorValueSchema,
});

/** A color for values from `from` (inclusive) up to `to` (exclusive). */
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

// A band is out of order when it is empty, starts below where the previous one
// ended, or, after the first, has no lower bound.
const outOfOrderBandIndexes = (bands: readonly ColorBand[]): number[] => {
  const indexes: number[] = [];
  let previousEnd = -Infinity;
  bands.forEach(({ from, to }, index) => {
    const start = from ?? -Infinity;
    const end = to ?? Infinity;
    const isEmpty = start >= end;
    const overlapsPrevious = start < previousEnd;
    const lacksLowerBound = index > 0 && from === undefined;
    if (isEmpty || overlapsPrevious || lacksLowerBound) {
      indexes.push(index);
    }
    previousEnd = end;
  });
  return indexes;
};

/** The colors a node carries: per series or category key, and by value range. */
export const chartColorsSchema = chartColorsObjectSchema
  .describe(
    'Colors resolved by whoever built the node. A renderer never picks a data color of its own.'
  )
  .check(
    crossSuperRefine<z.infer<typeof chartColorsObjectSchema>>(
      ({ bands }, context) => {
        for (const index of outOfOrderBandIndexes(bands ?? [])) {
          context.addIssue({
            code: 'custom',
            path: ['bands', index],
            message: BAND_RULE,
          });
        }
      },
      [BAND_RULE]
    )
  );

/** Colors resolved by whoever built the node. */
export type ChartColors = z.infer<typeof chartColorsSchema>;
