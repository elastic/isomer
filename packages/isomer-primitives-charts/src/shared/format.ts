/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { z } from 'zod';

// Numbers format as Kibana's field formats do: each kind compiles to the
// numeral pattern Lens's `decimalsToPattern` builds, read in English whatever
// locale the host set globally.

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

/** Schema of how a number reads: number, percent, bytes, bits or a numeral pattern. */
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
    z
      .object({
        kind: z.literal('pattern'),
        pattern: z
          .string()
          .min(1)
          .max(100)
          .describe('A numeral pattern, such as `0,0.[00]a` or `0.0b`.'),
        suffix: suffix.optional(),
      })
      .strict()
      .describe(
        "A numeral pattern, as Lens's custom format and Kibana's number, percent and bytes field formats take it."
      ),
  ])
  .describe(
    'How a number reads. Omitted, a number shows up to three decimals, as Kibana’s default number format does.'
  );

/** How a number reads, as {@link formatValue} formats it. */
export type ValueFormat = z.infer<typeof valueFormatSchema>;

const places = (count = 2) => (count === 0 ? '' : `.${'0'.repeat(count)}`);

/** The numeral pattern Lens's `decimalsToPattern` builds for a format. */
export const toPattern = (format: ValueFormat | undefined): string => {
  if (format === undefined) {
    return '0,0.[000]';
  }
  switch (format.kind) {
    case 'number':
      return `0,0${places(format.decimals)}${format.compact ? 'a' : ''}`;
    case 'percent':
      return `0,0${places(format.decimals)}${format.compact ? 'a' : ''}%`;
    case 'bytes':
      return `0,0${places(format.decimals)}b`;
    case 'bits':
      return `0,0${places(format.decimals)}bitd`;
    case 'pattern':
      return format.pattern;
  }
};

const withEnglish = <T>(read: () => T): T => {
  const previous = numeral.language();
  numeral.language('en');
  try {
    return read();
  } finally {
    numeral.language(previous);
  }
};

/** Formats `value` as Kibana would for the matching Lens format. */
export const formatValue = (value: number, format?: ValueFormat): string => {
  const end = format?.suffix ?? '';
  return withEnglish(() => numeral(value).format(toPattern(format))) + end;
};
