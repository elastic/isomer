/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { colorSchema } from '../shared/color';
import { valueFormatSchema } from '../shared/format';

// One pack-wide sanity cap; renderers truncate long text.
const LIMIT = 10_000;
const text = z.string().trim().min(1).max(LIMIT);
const align = z.enum(['left', 'center', 'right']);

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
  })
  .strict();

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
