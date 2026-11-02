/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/** Authoring budgets; totalPoints applies to every tile and both series together. */
export const METRIC_LIMITS = {
  tiles: 100,
  pointsPerSeries: 2000,
  totalPoints: 10000,
  text: 1000,
  relativeChange: 1000,
} as const;

const text = z.string().trim().min(1).max(METRIC_LIMITS.text);
const color = z
  .string()
  .regex(/^#[\da-f]{6}$/i, 'Use an opaque six-digit hex color');
const tone = z.enum(['neutral', 'good', 'bad', 'warning']);
const finite = z.number();
const locale = z
  .string()
  .max(80)
  .refine(isSupportedLocale, 'Unsupported locale');

function isSupportedLocale(value: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf(value).length === 1;
  } catch {
    return false;
  }
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Portable formatting, not a serialized Kibana field formatter. */
export const metricFormatSchema = z
  .strictObject({
    style: z
      .enum(['number', 'compact', 'percent', 'currency', 'bytes', 'duration'])
      .optional(),
    precision: z.int().min(0).max(10).optional(),
    locale: locale.optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    unit: z.enum(['ms', 's', 'm', 'h']).optional(),
    prefix: z.string().max(80).optional(),
    suffix: z.string().max(80).optional(),
  })
  .refine(
    (format) => format.style !== 'currency' || format.currency !== undefined,
    { message: 'Currency formatting requires a currency', path: ['currency'] }
  );
export type MetricFormat = z.infer<typeof metricFormatSchema>;

const reading = z.strictObject({
  label: text,
  value: z.union([
    finite,
    text,
    z
      .array(z.union([finite, text]))
      .min(1)
      .max(20),
    z.null(),
  ]),
  format: metricFormatSchema.optional(),
  formatted: text
    .optional()
    .describe(
      'Authoritative host-formatted text; never HTML. Omit to use the portable formatter.'
    ),
});
export type MetricReading = z.infer<typeof reading>;

const comparison = z.strictObject({
  baseline: z.union([finite, z.literal('primary')]),
  display: z.enum(['value', 'absolute', 'relative', 'both']),
  visuals: z.enum(['icon', 'value', 'both']).optional(),
  increase: z.enum(['good', 'bad', 'neutral']).optional(),
  palette: z
    .tuple([color, color, color])
    .optional()
    .describe('Down, unchanged, up; direction does not imply desirability.'),
});
const point = z.strictObject({
  time: z
    .int()
    .min(-8640000000000000)
    .max(8640000000000000)
    .describe('UTC epoch milliseconds, not a bucket index.'),
  value: finite.nullable(),
});
const points = z
  .array(point)
  .min(2)
  .max(METRIC_LIMITS.pointsPerSeries)
  .superRefine((series, context) => {
    const seen = new Set<number>();
    series.forEach(({ time }, index) => {
      if (seen.has(time)) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate instant',
          path: [index, 'time'],
        });
      }
      seen.add(time);
    });
  });
const trend = z.strictObject({
  primary: points,
  secondary: points.optional(),
  timeZone: z
    .string()
    .max(100)
    .refine(isTimeZone, 'Invalid time zone')
    .optional(),
  gap: z.enum(['gap', 'zero', 'connect']).optional(),
  shape: z.enum(['line', 'area', 'bars']).optional(),
});
const progress = z
  .strictObject({
    min: finite.optional(),
    max: finite,
    direction: z.enum(['horizontal', 'vertical']).optional(),
    label: text.optional(),
  })
  .refine(({ min = 0, max }) => max > min && Number.isFinite(max - min), {
    message: 'Progress max must exceed min with a finite span',
    path: ['max'],
  });

/** Tile-local shape. Cross-reading and collapse invariants live in validation.ts. */
export const metricTileSchema = z.strictObject({
  key: text,
  title: text.optional(),
  subtitle: text.optional(),
  primary: reading,
  secondary: reading
    .extend({
      labelPosition: z
        .enum(['before', 'after', 'hidden', 'tooltip'])
        .optional(),
      color: color.optional(),
      comparison: comparison.optional(),
    })
    .optional(),
  progress: progress.optional(),
  trend: trend.optional(),
  tone: tone.optional(),
  color: color.optional(),
  icon: text
    .optional()
    .describe('Portable text glyph, not a component name or SVG markup.'),
  action: z
    .strictObject({
      label: text,
      event: z.strictObject({
        name: text,
        context: z.record(z.string(), z.json()).optional(),
      }),
    })
    .optional(),
});
export type MetricTile = z.infer<typeof metricTileSchema>;

const band = z.strictObject({
  from: finite.optional(),
  color,
  tone: tone.optional(),
  label: text.optional(),
});
const palette = z
  .strictObject({
    scale: z.enum(['absolute', 'percent']),
    domain: z.strictObject({ min: finite, max: finite }).optional(),
    bands: z.array(band).min(1).max(20),
  })
  .superRefine(({ scale, domain, bands }, context) => {
    if (
      scale === 'percent' &&
      (!domain ||
        domain.max <= domain.min ||
        !Number.isFinite(domain.max - domain.min))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Percent palette requires a finite increasing domain',
        path: ['domain'],
      });
    }
    bands.forEach(({ from }, index) => {
      if (
        index > 0 &&
        (from === undefined || from <= (bands[index - 1]!.from ?? -Infinity))
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Band starts must strictly increase; only the first may be open',
          path: ['bands', index, 'from'],
        });
      }
    });
  });

/** Structural declaration, before the cross-tile validation pass. */
export const metricNodeSchema = z.strictObject({
  type: z.literal('metricTrend'),
  title: text,
  description: text.optional(),
  locale: locale.optional(),
  tiles: z.array(metricTileSchema).min(1).max(METRIC_LIMITS.tiles),
  palette: palette.optional(),
  color: color.optional(),
  applyColorTo: z.enum(['background', 'value']).optional(),
  layout: z
    .strictObject({
      columns: z.int().min(1).max(10).optional(),
      minTiles: z.int().min(1).max(METRIC_LIMITS.tiles).optional(),
      density: z.enum(['compact', 'default']).optional(),
      titleAlign: z.enum(['left', 'center', 'right']).optional(),
      primaryAlign: z.enum(['left', 'center', 'right']).optional(),
      secondaryAlign: z.enum(['left', 'center', 'right']).optional(),
      primaryPosition: z.enum(['top', 'middle', 'bottom']).optional(),
      valueFont: z.enum(['default', 'fit']).optional(),
      iconAlign: z.enum(['left', 'right']).optional(),
    })
    .optional(),
  collapse: z
    .strictObject({
      operation: z.enum(['sum', 'avg', 'min', 'max']),
      label: text,
      max: z.enum(['aggregate', 'static']).optional(),
    })
    .optional(),
});
export type MetricTrendModel = z.infer<typeof metricNodeSchema>;
