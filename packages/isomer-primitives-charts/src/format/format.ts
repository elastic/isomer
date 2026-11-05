/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cell, ColumnType } from '../schema/data';
import type { PortableFormat } from '../schema/format';

import { formatDate, toEpoch } from './date';
import { formatDuration } from './duration';
import { numberFormat, numberOptions } from './intl';

/** The text for values a format cannot show. */
export interface FormatLabels {
  /** A missing (`null` or absent) value. */
  readonly null: string;
  /** An empty string. */
  readonly empty: string;
  /** A number-like value that is not a number. */
  readonly nan: string;
}

export const DEFAULT_LABELS: FormatLabels = {
  null: '(null)',
  empty: '(blank)',
  nan: 'NaN',
};

/** What a formatter formats in, beside the value and its format. */
export interface FormatContext {
  /** A BCP 47 locale, such as `en` or `fr-CA`. */
  readonly locale: string;
  /** The time zone for a date format that names none. */
  readonly timeZone: string;
  readonly labels: FormatLabels;
  /** The id of the column the value belongs to, when there is one. */
  readonly column?: string;
}

/**
 * Turns one cell into the string every surface shows. `formatValue` is the
 * default; a host with its own formats, such as Kibana's field formats,
 * passes its own to `resolveChart`.
 */
export type ChartFormatter = (
  value: Cell | undefined,
  format: PortableFormat,
  context: FormatContext
) => string;

export interface FormatOptions {
  /** Absent means `en`. */
  readonly locale?: string | undefined;
  /** Absent means `UTC`. */
  readonly timeZone?: string | undefined;
  readonly labels?: Partial<FormatLabels> | undefined;
  readonly column?: string | undefined;
}

/** A complete context from options, with the defaults filled in. */
export const formatContext = ({
  locale,
  timeZone,
  labels,
  column,
}: FormatOptions = {}): FormatContext => ({
  locale: locale ?? 'en',
  timeZone: timeZone ?? 'UTC',
  labels: { ...DEFAULT_LABELS, ...labels },
  ...(column === undefined ? {} : { column }),
});

/** The format a value gets when its column and the chart state none. */
export const DEFAULT_FORMATS = {
  number: { kind: 'number', maximumFractionDigits: 3 },
  percent: { kind: 'percent', maximumFractionDigits: 3 },
  date: { kind: 'date' },
  text: { kind: 'text' },
} as const satisfies Record<string, PortableFormat>;

type Scalar = Exclude<Cell, readonly unknown[]> | undefined;

const BYTES = [
  'byte',
  'kilobyte',
  'megabyte',
  'gigabyte',
  'terabyte',
  'petabyte',
] as const;
const BITS = ['bit', 'kilobit', 'megabit', 'gigabit', 'terabit'] as const;

const prettyString = (value: Scalar | object, labels: FormatLabels) => {
  if (value === null || value === undefined) {
    return labels.null;
  }
  if (typeof value === 'string') {
    return value === '' ? labels.empty : value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, '  ');
  }
  return String(value);
};

const toNumber = (value: Scalar): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return undefined;
};

type NumericFormat = Extract<
  PortableFormat,
  { kind: 'number' | 'percent' | 'bytes' | 'bits' | 'duration' }
>;

const formatNumeric = (
  number: number,
  format: NumericFormat,
  locale: string
): string => {
  switch (format.kind) {
    case 'number':
      return numberFormat(locale, {
        ...numberOptions(format),
        ...(format.notation ? { notation: format.notation } : {}),
      }).format(number);
    case 'percent':
      return numberFormat(locale, {
        style: 'percent',
        ...numberOptions(format),
      }).format(format.fractional === false ? number / 100 : number);
    case 'bytes':
    case 'bits': {
      const units = format.kind === 'bytes' ? BYTES : BITS;
      const base = format.base ?? (format.kind === 'bytes' ? 1024 : 1000);
      const magnitude = Math.abs(number);
      const exponent =
        magnitude < 1
          ? 0
          : Math.min(
              units.length - 1,
              Math.floor(Math.log(magnitude) / Math.log(base))
            );
      return numberFormat(locale, {
        style: 'unit',
        unit: units[exponent]!,
        unitDisplay: format.unitDisplay ?? 'short',
        ...numberOptions(format),
      }).format(number / base ** exponent);
    }
    case 'duration':
      return formatDuration(number, format, locale);
  }
};

const formatScalar = (
  value: Scalar,
  format: PortableFormat,
  context: FormatContext
): string => {
  const { labels } = context;
  if (value === null || value === undefined) {
    return labels.null;
  }
  if (value === '') {
    return labels.empty;
  }
  switch (format.kind) {
    case 'number':
    case 'percent':
    case 'bytes':
    case 'bits':
    case 'duration': {
      const number = toNumber(value);
      if (number === undefined) {
        return prettyString(value, labels);
      }
      return Number.isNaN(number)
        ? labels.nan
        : formatNumeric(number, format, context.locale);
    }
    case 'date': {
      const epoch = toEpoch(value);
      return epoch === undefined
        ? String(value)
        : formatDate(epoch, format, context);
    }
    case 'text':
      return prettyString(value, labels);
  }
};

const withSuffix = (text: string, format: PortableFormat): string =>
  'suffix' in format && format.suffix !== undefined && text !== ''
    ? `${text}${format.suffix}`
    : text;

/** The default `ChartFormatter`, with `Intl`. */
export const intlFormatter: ChartFormatter = (value, format, context) =>
  withSuffix(
    Array.isArray(value)
      ? JSON.stringify(value.map((item) => formatScalar(item, format, context)))
      : formatScalar(value, format, context),
    format
  );

/**
 * Formats one cell with `Intl`: missing and empty values get their labels,
 * and a multivalue cell becomes a JSON array of its formatted values. A
 * `suffix` is appended to the whole result.
 */
export const formatValue = (
  value: Cell | undefined,
  format: PortableFormat,
  options?: FormatOptions
): string => intlFormatter(value, format, formatContext(options));

/** The format a column of `type` gets when it declares none. */
export const defaultFormatFor = (type: ColumnType): PortableFormat => {
  switch (type) {
    case 'number':
      return DEFAULT_FORMATS.number;
    case 'date':
      return DEFAULT_FORMATS.date;
    case 'string':
    case 'boolean':
      return DEFAULT_FORMATS.text;
  }
};
