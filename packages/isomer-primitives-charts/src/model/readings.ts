/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_LIMITS,
  type MetricFormat,
  type MetricReading,
  type MetricTile,
} from './declarations';

function numberText(
  value: number,
  format: MetricFormat,
  signed = false
): string {
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: format.precision ?? 0,
    maximumFractionDigits: format.precision ?? 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  };
  switch (format.style) {
    case 'percent':
      options.style = 'percent';
      break;
    case 'currency':
      options.style = 'currency';
      options.currency = format.currency!;
      break;
    case 'compact':
      options.notation = 'compact';
      break;
  }
  return new Intl.NumberFormat(format.locale ?? 'en-US', options).format(
    Object.is(value, -0) ? 0 : value
  );
}

/** Null is unavailable; host strings remain text and are never interpreted as markup. */
export function formatMetricValue(
  value: MetricReading['value'],
  format: MetricFormat = {}
): string {
  if (value === null) {
    return 'N/A';
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatMetricValue(item, format)).join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }

  let result: string;
  switch (format.style) {
    case 'bytes': {
      const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
      let index = 0;
      if (value !== 0) {
        index = Math.min(
          units.length - 1,
          Math.max(0, Math.floor(Math.log(Math.abs(value)) / Math.log(1024)))
        );
      }
      result = `${numberText(value / 1024 ** index, { ...format, style: 'number' })} ${units[index]}`;
      break;
    }
    case 'duration':
      result = `${numberText(value, { ...format, style: 'number' })} ${format.unit ?? 'ms'}`;
      break;
    default:
      result = numberText(value, format);
  }
  return `${format.prefix ?? ''}${result}${format.suffix ?? ''}`;
}

/** Resolve locale and preformatted text once for a reading. */
export function formatReading(
  reading: MetricReading,
  locale = 'en-US'
): string {
  return (
    reading.formatted ??
    formatMetricValue(reading.value, {
      ...reading.format,
      locale: reading.format?.locale ?? locale,
    })
  );
}

/** Trend samples and progress bounds use the reading's format, not its headline text. */
export function formatSample(
  value: number | null,
  reading: MetricReading,
  locale = 'en-US'
): string {
  return formatMetricValue(value, {
    ...reading.format,
    locale: reading.format?.locale ?? locale,
  });
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

function comparisonDirection(delta: number): MetricComparison['direction'] {
  if (delta > 0) {
    return 'up';
  }
  if (delta < 0) {
    return 'down';
  }
  return 'unchanged';
}

function comparisonTone(
  delta: number,
  increase: MetricComparison['tone'] = 'neutral'
): MetricComparison['tone'] {
  if (delta === 0 || increase === 'neutral') {
    return 'neutral';
  }
  if (delta > 0) {
    return increase;
  }
  return increase === 'good' ? 'bad' : 'good';
}

/** A zero denominator or an extreme ratio suppresses relative display, never the absolute delta. */
function relativeChange(delta: number, baseline: number): number | null {
  if (baseline === 0) {
    return null;
  }
  const ratio = delta / Math.abs(baseline);
  if (
    !Number.isFinite(ratio) ||
    Math.abs(ratio) >= METRIC_LIMITS.relativeChange
  ) {
    return null;
  }
  return ratio;
}

type SecondaryReading = NonNullable<MetricTile['secondary']>;
type ComparisonSettings = NonNullable<SecondaryReading['comparison']>;

function comparisonText(
  display: ComparisonSettings['display'],
  secondary: MetricReading,
  format: MetricFormat,
  absolute: string,
  relative: string | null
): string {
  switch (display) {
    case 'value':
      return secondary.formatted ?? formatMetricValue(secondary.value, format);
    case 'relative':
      return relative ?? absolute;
    case 'both':
      return relative === null ? absolute : `${absolute} (${relative})`;
    case 'absolute':
      return absolute;
  }
}

/**
 * 'primary' means primary minus secondary; a numeric baseline means secondary
 * minus the constant. Direction uses the raw delta, independently of desirability.
 */
export function compareMetric(
  tile: MetricTile,
  locale = 'en-US'
): MetricComparison | undefined {
  const secondary = tile.secondary;
  if (!secondary?.comparison) {
    return undefined;
  }
  const config = secondary.comparison;
  let current = secondary.value;
  let baseline: MetricReading['value'] = config.baseline;
  if (config.baseline === 'primary') {
    current = tile.primary.value;
    baseline = secondary.value;
  }
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
  const relative = relativeChange(absolute, baseline);
  const direction = comparisonDirection(absolute);
  const tone = comparisonTone(absolute, config.increase);
  const format = {
    ...secondary.format,
    locale: secondary.format?.locale ?? locale,
  };
  let absoluteText = `${absolute > 0 ? '+' : ''}${formatMetricValue(absolute, format)}`;
  if (format.style === 'percent') {
    absoluteText = `${numberText(absolute * 100, { ...format, style: 'number' }, true)} percentage points`;
  }
  let relativeText: string | null = null;
  if (relative !== null) {
    relativeText = numberText(
      relative,
      {
        style: 'percent',
        locale: format.locale,
        precision: format.precision ?? 2,
      },
      true
    );
  }
  const relativeDescription =
    relativeText === null
      ? '; relative change unavailable'
      : ` (${relativeText})`;
  const result: MetricComparison = {
    absolute,
    relative,
    direction,
    tone,
    formatted: comparisonText(
      config.display,
      secondary,
      format,
      absoluteText,
      relativeText
    ),
    description: `${direction}: ${absoluteText}${relativeDescription}; ${tone}`,
  };
  if (config.palette) {
    const index = { down: 0, unchanged: 1, up: 2, unavailable: 1 }[direction];
    result.color = config.palette[index]!;
  }
  return result;
}
