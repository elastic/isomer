/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DisplayValue,
  StructuredValue,
} from '../composition/structured_value';

import { formatCompactNumber } from './format_number';

export interface FormatDisplayValueOptions {
  /** Reference instant for `relativeTime`; defaults to the render time. */
  now?: Date;
}

/** Narrows a {@link DisplayValue} to the object form. */
export const isStructuredValue = (
  value: DisplayValue
): value is StructuredValue =>
  typeof value === 'object' && value !== null && 'raw' in value;

/** The unformatted value behind a {@link DisplayValue}. */
export const rawDisplayValue = (value: DisplayValue): number | string =>
  isStructuredValue(value) ? value.raw : value;

/**
 * Renders a {@link DisplayValue} for display. A bare string passes through; a
 * {@link StructuredValue} is formatted per its `format`.
 *
 * Numeric formats fall back to `String(raw)` for a string `raw` rather than
 * erroring. Locale is fixed to `en-US` and dates render in UTC so the same
 * composition formats identically on every host.
 */
export const formatDisplayValue = (
  value: DisplayValue,
  options: FormatDisplayValueOptions = {}
): string => {
  if (!isStructuredValue(value)) {
    return value;
  }
  const { raw, format, precision, currency } = value;
  switch (format) {
    case 'compact':
      return typeof raw === 'number' ? formatCompactNumber(raw) : String(raw);
    case 'percent':
      return typeof raw === 'number'
        ? intlNumber(raw, precision, { style: 'percent' })
        : String(raw);
    case 'currency':
      return typeof raw === 'number'
        ? intlNumber(raw, precision ?? 2, {
            style: 'currency',
            currency: currency ?? 'USD',
          })
        : String(raw);
    case 'bytes':
      return typeof raw === 'number'
        ? formatBytes(raw, precision)
        : String(raw);
    case 'duration':
      return typeof raw === 'number' ? formatDuration(raw) : String(raw);
    case 'date':
      return formatDate(raw);
    case 'relativeTime':
      return formatRelativeTime(raw, options.now ?? new Date());
    case 'number':
    default:
      return typeof raw === 'number'
        ? intlNumber(raw, precision, {})
        : String(raw);
  }
};

const intlNumber = (
  value: number,
  precision: number | undefined,
  options: Intl.NumberFormatOptions
): string =>
  new Intl.NumberFormat('en-US', {
    ...options,
    ...(precision === undefined
      ? { maximumFractionDigits: 2 }
      : {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }),
  }).format(value);

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

const formatBytes = (bytes: number, precision?: number): string => {
  let scaled = Math.abs(bytes);
  let unit = 0;
  while (scaled >= 1024 && unit < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  const sign = bytes < 0 ? '-' : '';
  const digits = unit === 0 ? 0 : (precision ?? 1);
  return `${sign}${trimFixed(scaled, digits)} ${BYTE_UNITS[unit]}`;
};

const formatDuration = (seconds: number): string => {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? '-' : '';
  if (abs < 1) {
    return `${sign}${trimFixed(abs * 1000, 1)}ms`;
  }
  if (abs < 60) {
    return `${sign}${trimFixed(abs, 1)}s`;
  }
  const pairs: Array<[number, string, number, string]> = [
    [86400, 'd', 3600, 'h'],
    [3600, 'h', 60, 'm'],
    [60, 'm', 1, 's'],
  ];
  for (const [major, majorUnit, minor, minorUnit] of pairs) {
    if (abs >= major) {
      const majorCount = Math.floor(abs / major);
      const minorCount = Math.floor((abs % major) / minor);
      return minorCount > 0
        ? `${sign}${majorCount}${majorUnit} ${minorCount}${minorUnit}`
        : `${sign}${majorCount}${majorUnit}`;
    }
  }
  return `${sign}${trimFixed(abs, 1)}s`;
};

const formatDate = (raw: number | string): string => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
};

const formatRelativeTime = (raw: number | string, now: Date): string => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(deltaSeconds);
  if (abs < 45) {
    return 'just now';
  }
  const unit =
    abs < 60 * 45
      ? ([Math.max(1, Math.round(abs / 60)), 'm'] as const)
      : abs < 3600 * 22
        ? ([Math.max(1, Math.round(abs / 3600)), 'h'] as const)
        : ([Math.max(1, Math.round(abs / 86400)), 'd'] as const);
  const phrase = `${unit[0]}${unit[1]}`;
  return deltaSeconds < 0 ? `${phrase} ago` : `in ${phrase}`;
};

const trimFixed = (value: number, digits: number): string => {
  const fixed = value.toFixed(digits);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
};
