/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

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
  .refine((value) => {
    try {
      return Intl.NumberFormat.supportedLocalesOf(value).length === 1;
    } catch {
      return false;
    }
  }, 'Unsupported locale');

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
    {
      message: 'Currency formatting requires a currency',
      path: ['currency'],
    }
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
  .superRefine((series, ctx) => {
    const seen = new Set<number>();
    series.forEach(({ time }, index) => {
      if (seen.has(time)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate instant',
          path: [index, 'time'],
        });
      }
      seen.add(time);
    });
  });
const timeZone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid time zone');
const trend = z.strictObject({
  primary: points,
  secondary: points.optional(),
  timeZone: timeZone.optional(),
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
  .refine(
    ({ min, max }) => max > (min ?? 0) && Number.isFinite(max - (min ?? 0)),
    {
      message: 'Progress max must exceed min with a finite span',
      path: ['max'],
    }
  );
const action = z.strictObject({
  label: text,
  event: z.strictObject({
    name: text,
    context: z.record(z.string(), z.json()).optional(),
  }),
});
const tile = z.strictObject({
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
  action: action.optional(),
});
export type MetricTile = z.infer<typeof tile>;

const band = z.strictObject({
  from: finite.optional(),
  color: color,
  tone: tone.optional(),
  label: text.optional(),
});
const palette = z
  .strictObject({
    scale: z.enum(['absolute', 'percent']),
    domain: z.strictObject({ min: finite, max: finite }).optional(),
    bands: z.array(band).min(1).max(20),
  })
  .superRefine(({ scale, domain, bands }, ctx) => {
    if (
      scale === 'percent' &&
      (!domain ||
        domain.max <= domain.min ||
        !Number.isFinite(domain.max - domain.min))
    ) {
      ctx.addIssue({
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
        ctx.addIssue({
          code: 'custom',
          message:
            'Band starts must strictly increase; only the first may be open',
          path: ['bands', index, 'from'],
        });
      }
    });
  });

export const metricTrendSchema = z
  .strictObject({
    type: z.literal('metricTrend'),
    title: text,
    description: text.optional(),
    locale: locale.optional(),
    tiles: z.array(tile).min(1).max(METRIC_LIMITS.tiles),
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
  })
  .superRefine((node, ctx) => {
    const keys = new Set<string>();
    let total = 0;
    node.tiles.forEach((value, i) => {
      const issue = (message: string, path: (string | number)[]) =>
        ctx.addIssue({ code: 'custom', message, path: ['tiles', i, ...path] });
      if (keys.has(value.key)) {
        issue('Duplicate tile key', ['key']);
      }
      keys.add(value.key);
      total +=
        (value.trend?.primary.length ?? 0) +
        (value.trend?.secondary?.length ?? 0);
      const secondary = value.secondary;
      if (secondary?.comparison) {
        const { baseline } = secondary.comparison;
        if (typeof secondary.value !== 'number' && secondary.value !== null) {
          issue('Comparison requires a numeric secondary reading', [
            'secondary',
            'value',
          ]);
        }
        if (
          baseline === 'primary' &&
          typeof value.primary.value !== 'number' &&
          value.primary.value !== null
        ) {
          issue('Primary baseline requires a numeric primary reading', [
            'primary',
            'value',
          ]);
        }
        const delta =
          baseline === 'primary'
            ? typeof value.primary.value === 'number' &&
              typeof secondary.value === 'number'
              ? value.primary.value - secondary.value
              : 0
            : typeof secondary.value === 'number'
              ? secondary.value - baseline
              : 0;
        if (
          !Number.isFinite(delta) ||
          (secondary.format?.style === 'percent' &&
            !Number.isFinite(delta * 100))
        ) {
          issue('Comparison difference must be finite', [
            'secondary',
            'comparison',
          ]);
        }
      }
      if (value.trend?.secondary && !secondary) {
        issue('Secondary trend requires a secondary reading', [
          'trend',
          'secondary',
        ]);
      }
      if (value.trend) {
        const values = [
          ...value.trend.primary,
          ...(value.trend.secondary ?? []),
        ].flatMap((p) => (p.value === null ? [] : [p.value]));
        if (
          values.length &&
          !Number.isFinite(Math.max(...values) - Math.min(...values))
        ) {
          issue('Trend value span must be finite', ['trend']);
        }
      }
      if (
        value.progress &&
        typeof value.primary.value !== 'number' &&
        value.primary.value !== null
      ) {
        issue('Progress requires a numeric primary reading', [
          'primary',
          'value',
        ]);
      }
      if (node.collapse) {
        if (value.action) {
          issue('Collapsed sources cannot declare tile actions', ['action']);
        }
        for (const [field, r] of [
          ['primary', value.primary],
          ['secondary', secondary],
        ] as const) {
          if (
            r &&
            ((typeof r.value !== 'number' && r.value !== null) ||
              r.formatted !== undefined)
          ) {
            issue(
              'Collapse requires numeric readings without preformatted text',
              [field]
            );
          }
        }
        const first = node.tiles[0]!;
        const signature = (t: MetricTile) =>
          JSON.stringify({
            primary: { label: t.primary.label, format: t.primary.format },
            secondary: t.secondary
              ? { ...t.secondary, value: null }
              : undefined,
            progress: t.progress
              ? {
                  ...t.progress,
                  max: node.collapse?.max === 'static' ? t.progress.max : null,
                }
              : undefined,
            trend: t.trend
              ? {
                  timeZone: t.trend.timeZone,
                  gap: t.trend.gap,
                  shape: t.trend.shape,
                  secondary: Boolean(t.trend.secondary),
                }
              : undefined,
            tone: t.tone,
            color: t.color,
            icon: t.icon,
          });
        if (signature(value) !== signature(first)) {
          issue(
            'Collapsed tiles must share reading formats, secondary semantics, progress domain and presentation',
            []
          );
        }
      }
    });
    if (total > METRIC_LIMITS.totalPoints) {
      ctx.addIssue({
        code: 'custom',
        message: `At most ${METRIC_LIMITS.totalPoints} trend points across all tiles and series`,
        path: ['tiles'],
      });
    }
    if (node.collapse && ctx.issues.length === 0) {
      try {
        const collapsed = metricTiles(node)[0]!;
        const parsed = tile.safeParse(collapsed);
        if (!parsed.success) {
          ctx.addIssue({
            code: 'custom',
            message: 'Collapse produces an invalid reading or progress domain',
            path: ['collapse'],
          });
        }
        if (collapsed.secondary?.comparison) {
          const c = compareMetric(collapsed, node.locale);
          if (
            c?.absolute !== null &&
            c?.absolute !== undefined &&
            !Number.isFinite(c.absolute)
          ) {
            ctx.addIssue({
              code: 'custom',
              message: 'Collapsed comparison must be finite',
              path: ['collapse'],
            });
          }
        }
      } catch (error) {
        if (!(error instanceof RangeError)) {
          throw error;
        }
        ctx.addIssue({
          code: 'custom',
          message: error.message,
          path: ['collapse'],
        });
      }
    }
  });
export type MetricTrendModel = z.infer<typeof metricTrendSchema>;

const numberText = (value: number, format: MetricFormat, signed = false) =>
  new Intl.NumberFormat(format.locale ?? 'en-US', {
    minimumFractionDigits: format.precision ?? 0,
    maximumFractionDigits: format.precision ?? 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
    ...(format.style === 'percent' ? { style: 'percent' as const } : {}),
    ...(format.style === 'currency'
      ? { style: 'currency' as const, currency: format.currency! }
      : {}),
    ...(format.style === 'compact' ? { notation: 'compact' as const } : {}),
  }).format(Object.is(value, -0) ? 0 : value);

export function formatMetricValue(
  value: MetricReading['value'],
  format: MetricFormat = {}
): string {
  if (value === null) {
    return 'N/A';
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatMetricValue(v, format)).join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  let result: string;
  if (format.style === 'bytes') {
    const index =
      value === 0
        ? 0
        : Math.min(
            5,
            Math.max(0, Math.floor(Math.log(Math.abs(value)) / Math.log(1024)))
          );
    result = `${numberText(value / 1024 ** index, { ...format, style: 'number' })} ${['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'][index]}`;
  } else if (format.style === 'duration') {
    result = `${numberText(value, { ...format, style: 'number' })} ${format.unit ?? 'ms'}`;
  } else {
    result = numberText(value, format);
  }
  return `${format.prefix ?? ''}${result}${format.suffix ?? ''}`;
}

export interface MetricComparison {
  absolute: number | null;
  relative: number | null;
  direction: 'up' | 'down' | 'unchanged' | 'unavailable';
  tone: 'good' | 'bad' | 'neutral';
  formatted: string;
  description: string;
  color?: string;
}

export function compareMetric(
  tile: MetricTile,
  localeName = 'en-US'
): MetricComparison | undefined {
  const secondary = tile.secondary;
  const config = secondary?.comparison;
  if (!secondary || !config) {
    return undefined;
  }
  const primaryBaseline = config.baseline === 'primary';
  const current = primaryBaseline ? tile.primary.value : secondary.value;
  const baseline = primaryBaseline ? secondary.value : config.baseline;
  if (typeof current !== 'number' || typeof baseline !== 'number') {
    return {
      absolute: null,
      relative: null,
      direction: 'unavailable',
      tone: 'neutral',
      formatted: 'N/A',
      description: 'Comparison unavailable',
    };
  }
  const absolute = current - baseline;
  const ratio = baseline === 0 ? null : absolute / Math.abs(baseline);
  const relative =
    ratio !== null &&
    Number.isFinite(ratio) &&
    Math.abs(ratio) < METRIC_LIMITS.relativeChange
      ? ratio
      : null;
  const direction = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'unchanged';
  const increase = config.increase ?? 'neutral';
  const status =
    absolute === 0 || increase === 'neutral'
      ? 'neutral'
      : absolute > 0
        ? increase
        : increase === 'good'
          ? 'bad'
          : 'good';
  const format = {
    ...secondary.format,
    locale: secondary.format?.locale ?? localeName,
  };
  const absoluteText =
    format.style === 'percent'
      ? `${numberText(absolute * 100, { ...format, style: 'number' }, true)} percentage points`
      : `${absolute > 0 ? '+' : ''}${formatMetricValue(absolute, format)}`;
  const relativeText =
    relative === null
      ? null
      : numberText(
          relative,
          {
            style: 'percent',
            locale: format.locale,
            precision: format.precision ?? 2,
          },
          true
        );
  const formatted =
    config.display === 'value'
      ? (secondary.formatted ?? formatMetricValue(secondary.value, format))
      : config.display === 'relative'
        ? (relativeText ?? absoluteText)
        : config.display === 'both' && relativeText !== null
          ? `${absoluteText} (${relativeText})`
          : absoluteText;
  return {
    absolute,
    relative,
    direction,
    tone: status,
    formatted,
    description: `${direction}: ${absoluteText}${relativeText === null ? '; relative change unavailable' : ` (${relativeText})`}; ${status}`,
    ...(config.palette
      ? { color: config.palette[absolute < 0 ? 0 : absolute > 0 ? 2 : 1] }
      : {}),
  };
}

export interface AlignedMetricPoint {
  time: number;
  primary: number | null;
  secondary: number | null;
}
export function alignMetricTrends(
  trendValue: NonNullable<MetricTile['trend']>
): AlignedMetricPoint[] {
  const primary = new Map(trendValue.primary.map((p) => [p.time, p.value]));
  const secondary = new Map(
    trendValue.secondary?.map((p) => [p.time, p.value]) ?? []
  );
  return [...new Set([...primary.keys(), ...secondary.keys()])]
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      primary: primary.get(time) ?? null,
      secondary: secondary.get(time) ?? null,
    }));
}

const aggregate = (
  values: (number | null)[],
  operation: NonNullable<MetricTrendModel['collapse']>['operation']
): number | null => {
  const present = values.filter((v): v is number => v !== null);
  if (!present.length) {
    return null;
  }
  const result =
    operation === 'min'
      ? Math.min(...present)
      : operation === 'max'
        ? Math.max(...present)
        : operation === 'avg'
          ? present.reduce((sum, value) => sum + value / present.length, 0)
          : present.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(result)) {
    throw new RangeError('Metric collapse produced a non-finite value');
  }
  return result;
};

/** Collapse is portable presentation aggregation, not Lens query planning. Nulls do not become zero. */
export function metricTiles(node: MetricTrendModel): MetricTile[] {
  if (!node.collapse) {
    return node.tiles;
  }
  const { operation, label } = node.collapse;
  const first = node.tiles[0]!;
  const numberOf = (value: MetricReading['value'] | undefined) =>
    typeof value === 'number' ? value : null;
  const trendValue = first.trend;
  const collapseSeries = (name: 'primary' | 'secondary') => {
    const series = node.tiles.map(
      (t) => new Map(t.trend?.[name]?.map((p) => [p.time, p.value]) ?? [])
    );
    const times = [...new Set(series.flatMap((s) => [...s.keys()]))].sort(
      (a, b) => a - b
    );
    return times.map((time) => ({
      time,
      value: aggregate(
        series.map((s) => s.get(time) ?? null),
        operation
      ),
    }));
  };
  return [
    {
      ...first,
      key: 'collapsed',
      title: label,
      primary: {
        ...first.primary,
        value: aggregate(
          node.tiles.map((t) => numberOf(t.primary.value)),
          operation
        ),
      },
      ...(first.secondary
        ? {
            secondary: {
              ...first.secondary,
              value: aggregate(
                node.tiles.map((t) => numberOf(t.secondary?.value)),
                operation
              ),
            },
          }
        : {}),
      ...(first.progress
        ? {
            progress: {
              ...first.progress,
              max:
                node.collapse.max === 'static'
                  ? first.progress.max
                  : aggregate(
                      node.tiles.map((t) => t.progress!.max),
                      operation
                    )!,
            },
          }
        : {}),
      ...(trendValue
        ? {
            trend: {
              ...trendValue,
              primary: collapseSeries('primary'),
              ...(trendValue.secondary
                ? { secondary: collapseSeries('secondary') }
                : {}),
            },
          }
        : {}),
    },
  ];
}

export function metricTileColor(
  node: MetricTrendModel,
  tileValue: MetricTile
): { color?: string | undefined; tone?: MetricTile['tone']; label?: string } {
  const value = tileValue.primary.value;
  const p = node.palette;
  let match: z.infer<typeof band> | undefined;
  if (p && typeof value === 'number') {
    const scaled =
      p.scale === 'percent'
        ? ((value - p.domain!.min) / (p.domain!.max - p.domain!.min)) * 100
        : value;
    match = [...p.bands]
      .reverse()
      .find((b) => b.from === undefined || scaled >= b.from);
  }
  return {
    ...((tileValue.color ?? match?.color ?? node.color)
      ? { color: tileValue.color ?? match?.color ?? node.color }
      : {}),
    ...((tileValue.tone ?? match?.tone)
      ? { tone: tileValue.tone ?? match?.tone }
      : {}),
    ...(match?.label ? { label: match.label } : {}),
  };
}

export function metricTimeLabel(
  time: number,
  zone = 'UTC',
  localeName = 'en-US'
): string {
  return new Intl.DateTimeFormat(localeName, {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'shortOffset',
    hourCycle: 'h23',
  }).format(time);
}

export function metricText(node: MetricTrendModel): string {
  const format = (r: MetricReading) =>
    r.formatted ??
    formatMetricValue(r.value, {
      ...r.format,
      locale: r.format?.locale ?? node.locale ?? 'en-US',
    });
  const blocks = metricTiles(node).map((t) => {
    const paint = metricTileColor(node, t);
    const compared = compareMetric(t, node.locale);
    const lines = [
      t.title ?? t.primary.label,
      ...(t.subtitle ? [t.subtitle] : []),
      `${t.primary.label}: ${format(t.primary)}`,
      ...(t.secondary
        ? [
            `${t.secondary.label}: ${format(t.secondary)}`,
            ...(compared
              ? [`Comparison: ${compared.formatted}`, compared.description]
              : []),
          ]
        : []),
      ...(paint.tone
        ? [`Status: ${paint.tone}${paint.label ? ` (${paint.label})` : ''}`]
        : []),
      ...(t.progress
        ? [
            `${t.progress.label ?? 'Progress'}: ${format(t.primary)} in [${format({ ...t.primary, value: t.progress.min ?? 0, formatted: undefined })}, ${format({ ...t.primary, value: t.progress.max, formatted: undefined })}]`,
          ]
        : []),
      ...(t.action
        ? [`Action: ${t.action.label} (requires host interaction)`]
        : []),
    ];
    if (t.trend) {
      lines.push(
        `Time (${t.trend.timeZone ?? 'UTC'}); ${t.primary.label}${t.trend.secondary ? `; ${t.secondary!.label}` : ''}; gaps: ${t.trend.gap ?? 'gap'}`
      );
      for (const p of alignMetricTrends(t.trend)) {
        lines.push(
          `${metricTimeLabel(p.time, t.trend.timeZone, node.locale)}: ${p.primary === null ? 'gap' : format({ ...t.primary, value: p.primary, formatted: undefined })}${t.trend.secondary ? `; ${p.secondary === null ? 'gap' : format({ ...t.secondary!, value: p.secondary, formatted: undefined })}` : ''}`
        );
      }
    }
    return lines.join('\n');
  });
  return [
    node.title,
    node.description,
    node.collapse
      ? `${node.collapse.operation} over ${node.tiles.length} source tiles`
      : undefined,
    ...blocks,
  ]
    .filter((v) => v !== undefined)
    .join('\n\n');
}
