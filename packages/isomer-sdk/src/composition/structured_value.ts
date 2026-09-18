/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Format hints a {@link StructuredValue} may carry. */
export const STRUCTURED_VALUE_FORMATS = [
  'number',
  'compact',
  'percent',
  'currency',
  'bytes',
  'duration',
  'date',
  'relativeTime',
] as const;

/** One of {@link STRUCTURED_VALUE_FORMATS}. */
export type StructuredValueFormat = (typeof STRUCTURED_VALUE_FORMATS)[number];

/**
 * A raw quantity plus a format hint, so every surface renders the same string.
 *
 * Formatting happens once, in `formatDisplayValue`, rather than per renderer —
 * otherwise the text and Slack surfaces drift on rounding.
 */
export interface StructuredValue {
  /** Unformatted, in base units — a `percent` of `0.42` renders as 42%. */
  raw: number | string;
  /** How to render `raw`. Absent passes a string through and gives a number default formatting. */
  format?: StructuredValueFormat;
  /** Fraction digits for numeric formats. Omitted trims to at most two. */
  precision?: number;
  /** ISO 4217 code for `currency`; defaults to USD. */
  currency?: string;
}

/** A value-bearing field: preformatted prose, or a {@link StructuredValue} to format. */
export type DisplayValue = string | StructuredValue;
