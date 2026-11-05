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
import { formatNumeral } from './numeral';

/** Kibana's text for a missing value in charts and text output. */
export const NULL_LABEL = '(null)';
/** Kibana's text for an empty string. */
export const EMPTY_LABEL = '(blank)';
/** Kibana's text for a number that is not one. */
export const NAN_LABEL = 'NaN';

/** Kibana's default patterns, from its `format:*:defaultPattern` and `dateFormat` settings. */
export const DEFAULT_PATTERNS = {
  number: '0,0.[000]',
  percent: '0,0.[000]%',
  bytes: '0,0.[0]b',
  date: 'MMM D, YYYY @ HH:mm:ss.SSS',
} as const;

type Scalar = Exclude<Cell, readonly unknown[]> | undefined;

const missingLabel = (value: unknown): string | undefined => {
  if (value === '') {
    return EMPTY_LABEL;
  }
  if (value === null || value === undefined) {
    return NULL_LABEL;
  }
  return undefined;
};

const prettyString = (value: Scalar | object): string => {
  if (value === null || value === undefined) {
    return NULL_LABEL;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, '  ');
  }
  return String(value);
};

type NumeralFormat = Extract<
  PortableFormat,
  { kind: 'number' | 'percent' | 'bytes' | 'bits' }
>;

const formatNumber = (value: Scalar, format: NumeralFormat): string => {
  if (value === null || value === undefined) {
    return NULL_LABEL;
  }
  let number: number;
  if (typeof value === 'number') {
    number = value;
  } else if (typeof value === 'string') {
    number = parseFloat(value);
  } else {
    return prettyString(value);
  }
  if (number === Infinity) {
    return '+∞';
  }
  if (number === -Infinity) {
    return '-∞';
  }
  if (!Number.isFinite(number)) {
    return NAN_LABEL;
  }
  if (format.kind === 'percent' && format.fractional === false) {
    number /= 100;
  }
  return formatNumeral(number, format);
};

const formatScalar = (value: Scalar, format: PortableFormat): string => {
  switch (format.kind) {
    case 'number':
    case 'percent':
    case 'bytes':
    case 'bits':
      return formatNumber(value, format);
    case 'duration': {
      const missing = missingLabel(value);
      if (missing !== undefined) {
        return missing;
      }
      const number = Number(value);
      return Number.isNaN(number)
        ? prettyString(value)
        : formatDuration(number, {
            input: format.input,
            output: format.output,
            decimals: format.decimals,
            showSuffix: format.showSuffix,
            useShortSuffix: format.useShortSuffix,
            includeSpaceWithSuffix: format.includeSpaceWithSuffix,
          });
    }
    case 'date': {
      if (value === null || value === undefined) {
        return NULL_LABEL;
      }
      const epoch = toEpoch(value);
      return epoch === undefined
        ? String(value)
        : formatDate(epoch, format.pattern, format.timeZone);
    }
    case 'text':
      return missingLabel(value) ?? prettyString(value);
  }
};

const withSuffix = (text: string, format: PortableFormat): string =>
  'suffix' in format && format.suffix !== undefined && text !== ''
    ? `${text}${format.suffix}`
    : text;

/**
 * Formats one cell as Kibana's field format does for text: missing and empty
 * values get Kibana's labels, and a multivalue cell becomes a JSON array of
 * its formatted values. A `suffix` is appended to the whole result.
 */
export const formatValue = (
  value: Cell | undefined,
  format: PortableFormat
): string =>
  withSuffix(
    Array.isArray(value)
      ? JSON.stringify(value.map((item) => formatScalar(item, format)))
      : formatScalar(value, format),
    format
  );

/** The format a column of `type` gets when it declares none, as Kibana's defaults. */
export const defaultFormatFor = (
  type: ColumnType,
  timeZone: string
): PortableFormat => {
  switch (type) {
    case 'number':
      return { kind: 'number', pattern: DEFAULT_PATTERNS.number };
    case 'date':
      return { kind: 'date', pattern: DEFAULT_PATTERNS.date, timeZone };
    case 'string':
    case 'boolean':
      return { kind: 'text' };
  }
};
