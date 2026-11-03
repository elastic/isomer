/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { actionSchema } from '../shared/action';
import { colorSchema } from '../shared/color';
import { valueFormatSchema } from '../shared/format';
import { pointsSchema } from '../shared/series';

// One pack-wide sanity cap; renderers truncate long text.
const LIMIT = 10_000;
const text = z.string().trim().min(1).max(LIMIT);
const align = z.enum(['left', 'center', 'right']);

const secondaryLabel = {
  label: text
    .optional()
    .describe('Names the secondary value. Omit to hide it.'),
  labelPosition: z
    .enum(['before', 'after', 'tooltip'])
    .optional()
    .describe(
      'Where the label sits relative to the value. Defaults to `before`.'
    ),
};

const secondarySchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('value'),
        ...secondaryLabel,
        value: z
          .union([z.number().finite(), text])
          .optional()
          .describe('The secondary reading. Omit to show only the badge.'),
        format: valueFormatSchema.optional(),
        badge: z
          .object({
            color: colorSchema,
            direction: z
              .enum(['up', 'down', 'flat'])
              .optional()
              .describe('Adds ↑, ↓ or = to the badge.'),
          })
          .strict()
          .optional()
          .describe('Draws the secondary value in a colored badge.'),
      })
      .strict(),
    z
      .object({
        kind: z.literal('change'),
        ...secondaryLabel,
        previous: z
          .number()
          .finite()
          .describe('The earlier reading the tile’s value is compared with.'),
        increase: z
          .enum(['good', 'bad', 'neutral'])
          .optional()
          .describe(
            'Whether a rise is good (green), bad (red) or neither. Defaults to `neutral`.'
          ),
        show: z
          .enum(['absolute', 'relative'])
          .optional()
          .describe(
            '`absolute` shows the difference in the tile’s format; `relative` the percentage change. Defaults to `relative`.'
          ),
      })
      .strict(),
  ])
  .describe(
    'A second reading under the value: a resolved `value`, or a `change` derived from a previous reading.'
  );

const visualSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('trend'),
        points: pointsSchema,
        shape: z
          .enum(['area', 'bars'])
          .optional()
          .describe('Defaults to `area`.'),
      })
      .strict()
      .describe('A sparkline behind the value.'),
    z
      .object({
        kind: z.literal('progress'),
        max: z
          .number()
          .finite()
          .describe(
            'Equal to `min`, the bar fills halfway; below `min`, it fills from the far end, as Elastic Charts draws them.'
          ),
        min: z.number().finite().optional().describe('Defaults to 0.'),
        direction: z
          .enum(['horizontal', 'vertical'])
          .optional()
          .describe('Defaults to `vertical`.'),
      })
      .strict()
      .describe('A bar filled from `min` to `max` by the tile’s value.'),
  ])
  .describe('A trend or a progress bar; a tile shows at most one.');

const metricTileSchema = z
  .object({
    key: text.describe(
      'Unique within the metric; identifies the tile to actions and tests.'
    ),
    title: text.optional(),
    subtitle: text.optional(),
    value: z
      .union([z.number().finite(), text, z.null()])
      .describe(
        'The headline reading. `null` is missing data and reads `N/A`, never zero.'
      ),
    format: valueFormatSchema.optional(),
    color: colorSchema
      .optional()
      .describe(
        'The tile’s color. Omitted, the tile uses the chart background.'
      ),
    colorTarget: z
      .enum(['background', 'value'])
      .optional()
      .describe(
        'Paint the tile background or the value text. Defaults to `background`.'
      ),
    secondary: secondarySchema.optional(),
    visual: visualSchema.optional(),
    action: actionSchema.optional(),
  })
  .strict()
  .check((ctx) => {
    const { value, secondary } = ctx.value;
    if (secondary?.kind === 'change' && typeof value !== 'number') {
      ctx.issues.push({
        code: 'custom',
        message: 'a `change` needs a numeric `value`',
        path: ['secondary'],
        input: secondary,
      });
    }
  });

/** Schema of a `metric` node. */
export const metricSchema = z
  .object({
    type: z.literal('metric'),
    tiles: z
      .array(metricTileSchema)
      .max(LIMIT)
      .describe(
        'One tile, or one per breakdown value in display order. None draws an empty grid.'
      ),
    placeholders: z
      .number()
      .int()
      .min(0)
      .max(LIMIT)
      .optional()
      .describe(
        'Empty cells after the tiles, as Lens pads a breakdown to the most values it can return. Defaults to 0.'
      ),
    columns: z
      .number()
      .int()
      .min(1)
      .max(LIMIT)
      .optional()
      .describe('Tiles per row. Defaults to 3.'),
    layout: z
      .object({
        titleAlign: align.optional().describe('Defaults to `left`.'),
        valueAlign: align.optional().describe('Defaults to `right`.'),
        secondaryAlign: align.optional().describe('Defaults to `right`.'),
        valuePosition: z
          .enum(['top', 'middle', 'bottom'])
          .optional()
          .describe('Defaults to `bottom`.'),
        valueSize: z
          .enum(['default', 'fit'])
          .optional()
          .describe(
            '`fit` grows the value to fill the tile. Defaults to `default`.'
          ),
        density: z.enum(['compact', 'default']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .check((ctx) => {
    const seen = new Set<string>();
    ctx.value.tiles.forEach(({ key }, index) => {
      if (seen.has(key)) {
        ctx.issues.push({
          code: 'custom',
          message: `duplicate tile key \`${key}\``,
          path: ['tiles', index, 'key'],
          input: key,
        });
      }
      seen.add(key);
    });
  });

/** A `metric` node: headline readings as a grid of tiles. */
export type MetricNode = z.infer<typeof metricSchema>;
/** One tile of a {@link MetricNode}. */
export type MetricTile = z.infer<typeof metricTileSchema>;
