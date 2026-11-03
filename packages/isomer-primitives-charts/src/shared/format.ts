/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

// Reproduces Kibana's numeral patterns for Lens formats (`0,0.00`, `0,0.00a`,
// `0,0.00%`, `0,0.00b` with binary units, `0,0.00bitd`), without Intl.

const decimals = z
  .number()
  .int()
  .min(0)
  .max(20)
  .describe('Fixed decimal places. Defaults to 2.');
const suffix = z
  .string()
  .max(40)
  .describe('Text appended to the formatted number, e.g. ` req/s`.');
const compact = z
  .boolean()
  .describe('Abbreviate thousands as `k`, `m`, `b` and `t`.');

/** Schema of how a number reads: number, percent, bytes or bits. */
export const valueFormatSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('number'),
        decimals: decimals.optional(),
        compact: compact.optional(),
        suffix: suffix.optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal('percent'),
        decimals: decimals.optional(),
        compact: compact.optional(),
        suffix: suffix.optional(),
      })
      .strict()
      .describe('The value is a ratio: 0.25 reads `25.00%`.'),
    z
      .object({
        kind: z.literal('bytes'),
        decimals: decimals.optional(),
        suffix: suffix.optional(),
      })
      .strict()
      .describe('Binary multiples labelled `KB`, `MB`, as Kibana shows them.'),
    z
      .object({
        kind: z.literal('bits'),
        decimals: decimals.optional(),
        suffix: suffix.optional(),
      })
      .strict()
      .describe('Decimal multiples labelled `kbit`, `Mbit`.'),
  ])
  .describe(
    'How a number reads. Omitted, a number shows up to three decimals, as Kibana’s default number format does.'
  );

/** How a number reads, as {@link formatValue} formats it. */
export type ValueFormat = z.infer<typeof valueFormatSchema>;

const ABBREVIATIONS: ReadonlyArray<readonly [number, string]> = [
  [1e12, 't'],
  [1e9, 'b'],
  [1e6, 'm'],
  [1e3, 'k'],
];
const BYTES = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const BITS = [
  'bit',
  'kbit',
  'Mbit',
  'Gbit',
  'Tbit',
  'Pbit',
  'Ebit',
  'Zbit',
  'Ybit',
];

/** numeral's rounding: half up through a decimal exponent, so 1.005 reads 1.01. */
const toFixed = (value: number, places: number): string => {
  const shifted = String(value).includes('e')
    ? value * 10 ** places
    : Number(`${value}e${places}`);
  return (Math.round(shifted) / 10 ** places).toFixed(places);
};

const group = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const formatNumber = (
  value: number,
  places: number,
  { optional = false, unit = '' }: { optional?: boolean; unit?: string } = {}
): string => {
  // Rounds the signed value, as numeral does: -2.5 reads -2.
  let fixed = toFixed(value, places);
  const negative = fixed.startsWith('-');
  fixed = negative ? fixed.slice(1) : fixed;
  if (optional && fixed.includes('.')) {
    fixed = fixed.replace(/\.?0+$/, '');
  }
  const [whole, fraction] = fixed.split('.');
  const sign = negative && Number(fixed) !== 0 ? '-' : '';
  return `${sign}${group(whole!)}${fraction ? `.${fraction}` : ''}${unit}`;
};

const abbreviate = (value: number): [number, string] => {
  const entry = ABBREVIATIONS.find(([size]) => Math.abs(value) >= size);
  return entry ? [value / entry[0], entry[1]] : [value, ''];
};

const scaled = (
  value: number,
  base: number,
  units: string[]
): [number, string] => {
  let power = 0;
  while (power < units.length - 1 && Math.abs(value) >= base ** (power + 1)) {
    power += 1;
  }
  return [value / base ** power, units[power]!];
};

/** Formats `value` as Kibana would for the matching Lens format. */
export const formatValue = (value: number, format?: ValueFormat): string => {
  if (format === undefined) {
    return formatNumber(value, 3, { optional: true });
  }
  const places = format.decimals ?? 2;
  const end = format.suffix ?? '';
  switch (format.kind) {
    case 'number': {
      const [shown, unit] = format.compact ? abbreviate(value) : [value, ''];
      return formatNumber(shown, places, { unit }) + end;
    }
    case 'percent': {
      const [shown, unit] = format.compact
        ? abbreviate(value * 100)
        : [value * 100, ''];
      return `${formatNumber(shown, places, { unit })}%${end}`;
    }
    case 'bytes': {
      const [shown, unit] = scaled(value, 1024, BYTES);
      return formatNumber(shown, places, { unit }) + end;
    }
    case 'bits': {
      const [shown, unit] = scaled(value, 1000, BITS);
      return formatNumber(shown, places, { unit }) + end;
    }
  }
};
