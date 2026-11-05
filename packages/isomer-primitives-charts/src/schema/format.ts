/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString, z } from '@elastic/isomer-sdk';

// The fields number-like formats share, as Kibana's Numeral-based field formats take them.
const numeralShape = {
  pattern: requiredString().describe(
    'A Numeral.js pattern, as Kibana field formats take it, such as `0,0.[000]`.'
  ),
  locale: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The Numeral.js locale Kibana formats numbers in (`format:number:defaultLocale`), such as `en` or `de`. Absent means `en`.'
    ),
  alwaysShowSign: z
    .boolean()
    .optional()
    .describe('Prefix `+` to positive values that do not round to zero.'),
  suffix: z
    .string()
    .optional()
    .describe('Text appended to the formatted value.'),
};

const DURATION_INPUT_UNITS = [
  'picoseconds',
  'nanoseconds',
  'microseconds',
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
] as const;

/** A unit a duration column's raw value can be stored in. */
export type DurationUnit = (typeof DURATION_INPUT_UNITS)[number];

const DURATION_OUTPUT_UNITS = [
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
] as const;

/**
 * How a column formats its values: the Kibana field formats that have a
 * portable definition. Anything else travels as pre-rendered `data.display`
 * strings with a `losses` entry.
 */
export const portableFormatSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('number'), ...numeralShape }),
    z.strictObject({ kind: z.literal('percent'), ...numeralShape }),
    z.strictObject({ kind: z.literal('bytes'), ...numeralShape }),
    z.strictObject({ kind: z.literal('bits'), ...numeralShape }),
    z.strictObject({
      kind: z.literal('duration'),
      input: z
        .enum(DURATION_INPUT_UNITS)
        .describe('The unit the raw value is stored in.'),
      output: z
        .union([
          z.enum(DURATION_OUTPUT_UNITS),
          z.literal('humanize'),
          z.literal('humanizePrecise'),
        ])
        .describe(
          'A unit to convert to, `humanize` for an approximate phrase such as "a few seconds", or `humanizePrecise` for the largest whole unit with decimals.'
        ),
      decimals: z.int().min(0).optional(),
      showSuffix: z.boolean().optional(),
      useShortSuffix: z.boolean().optional(),
      includeSpaceWithSuffix: z.boolean().optional(),
      suffix: numeralShape.suffix,
    }),
    z.strictObject({
      kind: z.literal('date'),
      pattern: requiredString().describe(
        'A Moment.js date pattern, as Kibana field formats take it, such as `MMM D, YYYY @ HH:mm:ss.SSS`.'
      ),
      timeZone: requiredString().describe(
        'The IANA time zone dates display in, such as `UTC` or `Europe/Paris`.'
      ),
    }),
    z.strictObject({ kind: z.literal('text') }),
  ])
  .describe(
    'How a column formats its values. Formats outside this set arrive as pre-rendered `data.display` strings with a `losses` entry.'
  );

/** A format a renderer applies to a column's values. */
export type PortableFormat = z.infer<typeof portableFormatSchema>;
