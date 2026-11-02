/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/** Authoring budgets; totalPoints applies to every tile and both series together. */
export const METRIC_LIMITS = {
  /** Maximum source tiles per node, before collapse. */
  tiles: 100,
  /** Maximum samples in each individual primary or secondary series. */
  pointsPerSeries: 2000,
  /** Maximum samples across all source tiles and both series, before alignment. */
  totalPoints: 10000,
  /** Maximum UTF-16 code units in a general label or host-formatted reading. */
  text: 1000,
  /** Relative-change ratio magnitude at which display becomes unavailable. */
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

// Named shapes keep field JSDoc on inferred types in emitted declarations.
const formatShape = {
  /** Numeric presentation; omitted means ordinary decimal formatting. */
  style: z
    .enum(['number', 'compact', 'percent', 'currency', 'bytes', 'duration'])
    .optional(),
  /** Exact fractional digit count (0-10); omitted permits zero to two digits. */
  precision: z.int().min(0).max(10).optional(),
  /** Supported Intl locale, overriding the node/caller locale. */
  locale: locale.optional(),
  /** Three-letter uppercase currency code, required for currency style. */
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  /** Duration label only, without conversion; defaults to ms. */
  unit: z.enum(['ms', 's', 'm', 'h']).optional(),
  /** Plain-text prefix for numeric output only. */
  prefix: z.string().max(80).optional(),
  /** Plain-text suffix for numeric output only. */
  suffix: z.string().max(80).optional(),
};

/** Portable formatting, not a serialized Kibana field formatter. */
export const metricFormatSchema: z.ZodObject<
  typeof formatShape,
  z.core.$strict
> = z
  .strictObject(formatShape)
  .refine(
    (format) => format.style !== 'currency' || format.currency !== undefined,
    { message: 'Currency formatting requires a currency', path: ['currency'] }
  );
/**
 * Serializable portable number formatting, inferred from metricFormatSchema.
 * Percent consumes ratios; bytes uses binary units; duration labels do not
 * convert units. Strings and authoritative formatted text bypass this policy.
 */
export type MetricFormat = z.infer<typeof metricFormatSchema>;

const readingShape = {
  /** Required human-readable reading name, also used in nonvisual output. */
  label: text,
  /** Finite number, plain text, nonempty mixed array, or null for missing data. */
  value: z.union([
    finite,
    text,
    z
      .array(z.union([finite, text]))
      .min(1)
      .max(20),
    z.null(),
  ]),
  /** Independent formatting for this reading; never inherited from its sibling. */
  format: metricFormatSchema.optional(),
  /** Authoritative plain text, overriding headline formatting, not raw arithmetic. */
  formatted: text
    .optional()
    .describe(
      'Authoritative host-formatted text; never HTML. Omit to use the portable formatter.'
    ),
};
const reading: z.ZodObject<typeof readingShape, z.core.$strict> =
  z.strictObject(readingShape);
/**
 * Named resolved reading; null means missing, never zero.
 * Formatting belongs to this reading independently of its primary/secondary
 * peer. Host-formatted text does not replace raw values used by arithmetic.
 */
export type MetricReading = z.infer<typeof reading>;

const comparisonShape = {
  /** Primary means primary minus secondary; a constant means secondary minus it. */
  baseline: z.union([finite, z.literal('primary')]),
  /**
   * Requested value/delta text. Relative uses delta / absolute baseline magnitude,
   * suppressed at zero or ratio magnitude >= 1000. Relative-only then falls back
   * to absolute; both includes relative only when available.
   */
  display: z.enum(['value', 'absolute', 'relative', 'both']),
  /** Badge contents; omitted means both direction icon and value. */
  visuals: z.enum(['icon', 'value', 'both']).optional(),
  /** Desirability of an increase; defaults neutral, reverses for a decrease. */
  increase: z.enum(['good', 'bad', 'neutral']).optional(),
  /** Opaque hex tuple in down, unchanged, up order; independent of desirability. */
  palette: z
    .tuple([color, color, color])
    .optional()
    .describe('Down, unchanged, up; direction does not imply desirability.'),
};
const comparison: z.ZodObject<typeof comparisonShape, z.core.$strict> =
  z.strictObject(comparisonShape);
const pointShape = {
  /** UTC epoch milliseconds within JavaScript's Date range; unique per series. */
  time: z
    .int()
    .min(-8640000000000000)
    .max(8640000000000000)
    .describe('UTC epoch milliseconds, not a bucket index.'),
  /** Finite measured sample or null gap; not necessarily the headline reading. */
  value: finite.nullable(),
};
const point: z.ZodObject<typeof pointShape, z.core.$strict> =
  z.strictObject(pointShape);
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
const trendShape = {
  /** Two or more unique instants; ordering is normalized during alignment. */
  primary: points,
  /** Independent instants; requires a secondary reading, not positional pairing. */
  secondary: points.optional(),
  /** Intl timezone for labels only; defaults UTC, never shifts stored instants. */
  timeZone: z
    .string()
    .max(100)
    .refine(isTimeZone, 'Invalid time zone')
    .optional(),
  /** Drawing-only missing-data policy; defaults gap. Tables/text always retain gaps. */
  gap: z.enum(['gap', 'zero', 'connect']).optional(),
  /** Sparkline geometry; defaults line. */
  shape: z.enum(['line', 'area', 'bars']).optional(),
};
const trend: z.ZodObject<typeof trendShape, z.core.$strict> =
  z.strictObject(trendShape);
const progressShape = {
  /** Signed lower bound; defaults zero. */
  min: finite.optional(),
  /** Upper bound, greater than min with a finite span; not a gauge declaration. */
  max: finite,
  /** Progress orientation; defaults horizontal. */
  direction: z.enum(['horizontal', 'vertical']).optional(),
  /** Target label; browser target defaults to Target, nonvisual range to Progress. */
  label: text.optional(),
};
const progress: z.ZodObject<typeof progressShape, z.core.$strict> = z
  .strictObject(progressShape)
  .refine(({ min = 0, max }) => max > min && Number.isFinite(max - min), {
    message: 'Progress max must exceed min with a finite span',
    path: ['max'],
  });

const secondaryShape = {
  ...readingShape,
  /** Secondary name placement; defaults before, hidden suppresses visual name. */
  labelPosition: z.enum(['before', 'after', 'hidden', 'tooltip']).optional(),
  /** Explicit secondary badge paint; comparison paint takes precedence in the browser. */
  color: color.optional(),
  /** Numeric/null comparison policy; missing sides produce neutral N/A. */
  comparison: comparison.optional(),
};
const secondary: z.ZodObject<typeof secondaryShape, z.core.$strict> =
  z.strictObject(secondaryShape);
const eventShape = {
  /** Host-defined event identifier; Isomer does not interpret it. */
  name: text,
  /** Optional JSON payload, without executable behavior. */
  context: z.record(z.string(), z.json()).optional(),
};
const event: z.ZodObject<typeof eventShape, z.core.$strict> =
  z.strictObject(eventShape);
const actionShape = {
  /** Accessible button name. */
  label: text,
  /** Serializable event forwarded to the host's onEvent callback. */
  event,
};
const action: z.ZodObject<typeof actionShape, z.core.$strict> =
  z.strictObject(actionShape);

const tileShape = {
  /** Stable nonempty identity, unique within the node. */
  key: text,
  /** Visual title override; otherwise the primary label is used. */
  title: text.optional(),
  /** Supporting plain text beneath the title. */
  subtitle: text.optional(),
  /** Headline reading; numeric/null required when progress is present. */
  primary: reading,
  /** Independent optional reading; no previous-period value is inferred. */
  secondary: secondary.optional(),
  /** Numeric range fill; out-of-range readings remain unchanged, only fill clamps. */
  progress: progress.optional(),
  /** Timestamped primary and optional secondary sparks, independent of headlines. */
  trend: trend.optional(),
  /** Semantic status overriding the matching palette band's status. */
  tone: tone.optional(),
  /** Opaque six-digit hex paint overriding palette and chart colors. */
  color: color.optional(),
  /** Text glyph only, not a component name or serialized SVG. */
  icon: text
    .optional()
    .describe('Portable text glyph, not a component name or SVG markup.'),
  /** Explicit host interaction; no transport, navigation or filtering is performed. */
  action: action.optional(),
};
/** Tile-local shape. Cross-reading and collapse invariants live in validation.ts. */
export const metricTileSchema: z.ZodObject<typeof tileShape, z.core.$strict> =
  z.strictObject(tileShape);
/**
 * One keyed breakdown tile with a required primary and independent secondary.
 * Comparison direction is separate from good/bad status; trends and progress
 * use raw numbers even when the headline uses host-formatted text.
 * Validate cross-field relationships with metricTrendSchema, not this type.
 */
export type MetricTile = z.infer<typeof metricTileSchema>;

const bandShape = {
  /** Inclusive lower bound; only the first band may omit it (negative infinity). */
  from: finite.optional(),
  /** Required opaque six-digit hex paint. */
  color,
  /** Optional semantic status, independent of paint. */
  tone: tone.optional(),
  /** Human-readable status qualifier included in nonvisual output. */
  label: text.optional(),
};
const band: z.ZodObject<typeof bandShape, z.core.$strict> =
  z.strictObject(bandShape);
const domainShape = {
  /** Lower endpoint for percentage scaling, in the primary reading's units. */
  min: finite,
  /** Upper endpoint; must exceed min with a finite span for percentage scaling. */
  max: finite,
};
const domain: z.ZodObject<typeof domainShape, z.core.$strict> =
  z.strictObject(domainShape);
const paletteShape = {
  /** Compare raw values or percentages of the explicit domain. */
  scale: z.enum(['absolute', 'percent']),
  /** Required finite increasing range for percent scale; not inferred from data. */
  domain: domain.optional(),
  /** Increasing inclusive lower bounds, at most 20; last matching band wins. */
  bands: z.array(band).min(1).max(20),
};
const palette: z.ZodObject<typeof paletteShape, z.core.$strict> = z
  .strictObject(paletteShape)
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

const layoutShape = {
  /** Maximum grid columns (1-10); baseline defaults to three, bounded by tiles. */
  columns: z.int().min(1).max(10).optional(),
  /** Minimum visual slots (1-100); extra slots are empty, not invented data. */
  minTiles: z.int().min(1).max(METRIC_LIMITS.tiles).optional(),
  /** Compact or regular layout; browser omission leaves engine spacing alone. */
  density: z.enum(['compact', 'default']).optional(),
  /** Authored title/subtitle alignment. */
  titleAlign: z.enum(['left', 'center', 'right']).optional(),
  /** Authored headline alignment, independent of secondary alignment. */
  primaryAlign: z.enum(['left', 'center', 'right']).optional(),
  /** Authored secondary alignment. */
  secondaryAlign: z.enum(['left', 'center', 'right']).optional(),
  /** Authored vertical headline position. */
  primaryPosition: z.enum(['top', 'middle', 'bottom']).optional(),
  /** Engine font policy; baseline fit is an approximation without text measurement. */
  valueFont: z.enum(['default', 'fit']).optional(),
  /** Authored text-glyph placement. */
  iconAlign: z.enum(['left', 'right']).optional(),
};
const layout: z.ZodObject<typeof layoutShape, z.core.$strict> =
  z.strictObject(layoutShape);
const collapseShape = {
  /** Ignore missing contributors; all-missing groups remain null. */
  operation: z.enum(['sum', 'avg', 'min', 'max']),
  /** Title of the single resulting tile, whose key becomes collapsed. */
  label: text,
  /** Static keeps shared maxima; omitted/aggregate applies the operation. */
  max: z.enum(['aggregate', 'static']).optional(),
};
const collapse: z.ZodObject<typeof collapseShape, z.core.$strict> =
  z.strictObject(collapseShape);
const nodeShape = {
  /** Portable primitive discriminator, not a Lens visualization ID. */
  type: z.literal('metricTrend'),
  /** Required visible figure name and accessible label. */
  title: text,
  /** Supporting account included in visual and nonvisual output. */
  description: text.optional(),
  /** Supported Intl locale; reading-level format locale wins, default en-US. */
  locale: locale.optional(),
  /** Ordered source tiles, 1-100; retained even when presentation is collapsed. */
  tiles: z.array(metricTileSchema).min(1).max(METRIC_LIMITS.tiles),
  /** Explicit numeric color bands; tile paint/status can override independently. */
  palette: palette.optional(),
  /** Opaque six-digit hex fallback after tile and palette colors. */
  color: color.optional(),
  /** Paint target; defaults background. Value-only keeps the host surface. */
  applyColorTo: z.enum(['background', 'value']).optional(),
  /** Optional authored layout; omitted browser settings inherit engine defaults. */
  layout: layout.optional(),
  /**
   * Presentation aggregation, never query planning. Sources must share numeric
   * reading formats, comparison/progress semantics and presentation. Preformatted
   * readings and per-source actions are rejected; trends aggregate by UTC instant.
   */
  collapse: collapse.optional(),
};
/** Structural declaration, before the cross-tile validation pass. */
export const metricNodeSchema: z.ZodObject<typeof nodeShape, z.core.$strict> =
  z.strictObject(nodeShape);
/**
 * Serializable resolved metric/trend declaration, not Lens state or query input.
 * Types alone do not enforce bounds, unique keys or cross-field invariants:
 * validate unknown input with metricTrendSchema before presentation helpers.
 * Source tiles remain intact when collapse aggregates their presentation.
 */
export type MetricTrendModel = z.infer<typeof metricNodeSchema>;
