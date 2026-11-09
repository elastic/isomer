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
import { formatNumber, numberFormat, numberOptions } from './intl';

/** The text for values a format cannot show. */
interface MissingText {
  /** A missing (`null` or absent) value. */
  readonly null: string;
  /** An empty string. */
  readonly empty: string;
  /** A value that is not a number in a numeric format. */
  readonly nan: string;
}

const DEFAULT_MISSING: MissingText = {
  null: '(null)',
  empty: '(blank)',
  nan: 'NaN',
};

/** What a missing value prints as. */
export const NULL_LABEL = DEFAULT_MISSING.null;

/** What an empty string prints as. */
export const EMPTY_LABEL = DEFAULT_MISSING.empty;

interface FormatContext {
  /** A BCP 47 locale, such as `en` or `fr-CA`. */
  readonly locale: string;
  /** The time zone for a date format that names none. */
  readonly timeZone: string;
  readonly missing: MissingText;
}

interface FormatOptions {
  /** Absent means `en`. */
  readonly locale?: string | undefined;
  /** Absent means `UTC`. */
  readonly timeZone?: string | undefined;
  /** The node's `data.missing`; absent texts keep their defaults. */
  readonly missing?:
    { readonly [Key in keyof MissingText]?: string | undefined } | undefined;
}

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

const prettyString = (value: Scalar | object, missing: MissingText) => {
  if (value === null || value === undefined) {
    return missing.null;
  }
  if (typeof value === 'string') {
    return value === '' ? missing.empty : value;
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
      return formatNumber(
        numberFormat(locale, {
          ...numberOptions(format),
          ...(format.notation ? { notation: format.notation } : {}),
        }),
        number
      );
    case 'percent':
      return formatNumber(
        numberFormat(locale, { style: 'percent', ...numberOptions(format) }),
        format.fractional === false ? number / 100 : number
      );
    case 'bytes':
    case 'bits': {
      const units = format.kind === 'bytes' ? BYTES : BITS;
      const base = format.base ?? (format.kind === 'bytes' ? 1024 : 1000);
      const magnitude = Math.abs(number);
      let exponent = 0;
      while (
        exponent < units.length - 1 &&
        magnitude >= base ** (exponent + 1)
      ) {
        exponent++;
      }
      return formatNumber(
        numberFormat(locale, {
          style: 'unit',
          unit: units[exponent]!,
          unitDisplay: format.unitDisplay ?? 'short',
          ...numberOptions(format),
        }),
        number / base ** exponent
      );
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
  const { missing } = context;
  if (value === null || value === undefined) {
    return missing.null;
  }
  if (value === '') {
    return missing.empty;
  }
  switch (format.kind) {
    case 'number':
    case 'percent':
    case 'bytes':
    case 'bits':
    case 'duration': {
      const number = toNumber(value);
      if (number === undefined) {
        return prettyString(value, missing);
      }
      return Number.isNaN(number)
        ? missing.nan
        : formatNumeric(number, format, context.locale);
    }
    case 'date': {
      const epoch = toEpoch(value);
      return epoch === undefined
        ? String(value)
        : formatDate(epoch, format, context);
    }
    case 'text':
      return prettyString(value, missing);
  }
};

const withSuffix = (text: string, format: PortableFormat): string =>
  'suffix' in format && format.suffix !== undefined
    ? `${text}${format.suffix}`
    : text;

/**
 * Formats one cell with `Intl`: missing and empty values get their text,
 * and a multivalue cell becomes a JSON array of its formatted values. A
 * `suffix` is appended to the whole result, except to a missing or empty
 * value's text.
 */
export const formatValue = (
  value: Cell | undefined,
  format: PortableFormat,
  { locale = 'en', timeZone = 'UTC', missing }: FormatOptions = {}
): string => {
  const context: FormatContext = {
    locale,
    timeZone,
    missing: {
      null: missing?.null ?? DEFAULT_MISSING.null,
      empty: missing?.empty ?? DEFAULT_MISSING.empty,
      nan: missing?.nan ?? DEFAULT_MISSING.nan,
    },
  };
  if (Array.isArray(value)) {
    return withSuffix(
      JSON.stringify(value.map((item) => formatScalar(item, format, context))),
      format
    );
  }
  const text = formatScalar(value, format, context);
  return value === null || value === undefined || value === ''
    ? text
    : withSuffix(text, format);
};

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
