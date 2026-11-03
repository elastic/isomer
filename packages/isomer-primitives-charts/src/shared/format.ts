/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import moment from 'moment';
import { z } from 'zod';

// Numbers format as Kibana's field formats do: each kind compiles to the
// numeral pattern Lens's `decimalsToPattern` builds, and durations follow
// `DurationFormat`. Both read English, whatever locale the host set globally.

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

const DURATION_INPUTS = [
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

/** Each fixed output's long and short unit, from Kibana's `DURATION_OUTPUT_FORMATS`. */
const DURATION_UNITS = {
  asMilliseconds: ['milliseconds', 'ms'],
  asSeconds: ['seconds', 's'],
  asMinutes: ['minutes', 'min'],
  asHours: ['hours', 'h'],
  asDays: ['days', 'd'],
  asWeeks: ['weeks', 'w'],
  asMonths: ['months', 'mon'],
  asYears: ['years', 'y'],
} as const;

type DurationOutput =
  'humanize' | 'humanizePrecise' | keyof typeof DURATION_UNITS;

const DURATION_OUTPUTS = [
  'humanize',
  'humanizePrecise',
  ...(Object.keys(DURATION_UNITS) as (keyof typeof DURATION_UNITS)[]),
] as [DurationOutput, ...DurationOutput[]];

/** Schema of how a number reads: number, percent, bytes, bits, a numeral pattern or a duration. */
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
    z
      .object({
        kind: z.literal('duration'),
        from: z
          .enum(DURATION_INPUTS)
          .optional()
          .describe('The unit the value is in. Defaults to `seconds`.'),
        to: z
          .enum(DURATION_OUTPUTS)
          .optional()
          .describe(
            '`humanize` reads approximately (`an hour`), `humanizePrecise` in the largest whole unit (`1.50 hours`), or a fixed unit such as `asMinutes`. Defaults to `humanize`.'
          ),
        decimals: decimals.optional(),
        short: z
          .boolean()
          .optional()
          .describe('Short unit names, such as `min` for minutes.'),
        showSuffix: z
          .boolean()
          .optional()
          .describe(
            'Name the unit after a fixed unit’s number. Defaults to `true`, as Lens shows it.'
          ),
        spaceBeforeSuffix: z
          .boolean()
          .optional()
          .describe('Put a space before the unit. Defaults to `true`.'),
      })
      .strict()
      .describe('A length of time, as Kibana’s duration format reads it.'),
  ])
  .describe(
    'How a number reads. Omitted, a number shows up to three decimals, as Kibana’s default number format does.'
  );

/** How a number reads, as {@link formatValue} formats it. */
export type ValueFormat = z.infer<typeof valueFormatSchema>;

type NumeralFormat = Exclude<ValueFormat, { kind: 'duration' }>;

const places = (count = 2) => (count === 0 ? '' : `.${'0'.repeat(count)}`);

/** The numeral pattern Lens's `decimalsToPattern` builds for a format. */
export const toPattern = (format: NumeralFormat | undefined): string => {
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

const TO_SECONDS: Partial<Record<(typeof DURATION_INPUTS)[number], number>> = {
  picoseconds: 1e-12,
  nanoseconds: 1e-9,
  microseconds: 1e-6,
};

const PRECISE: ReadonlyArray<readonly [number, keyof typeof DURATION_UNITS]> = [
  [31_536_000, 'asYears'],
  // Kibana's precise output counts a month as 30 days.
  [2_592_000, 'asMonths'],
  [604_800, 'asWeeks'],
  [86_400, 'asDays'],
  [3_600, 'asHours'],
  [60, 'asMinutes'],
  [1, 'asSeconds'],
  [0.001, 'asMilliseconds'],
];

const formatDuration = (
  value: number,
  {
    from = 'seconds',
    to = 'humanize',
    decimals: precision = 2,
    short = false,
    showSuffix = true,
    spaceBeforeSuffix = true,
  }: Extract<ValueFormat, { kind: 'duration' }>
): string => {
  const space = spaceBeforeSuffix ? ' ' : '';
  const unit = (method: keyof typeof DURATION_UNITS) =>
    DURATION_UNITS[method][short ? 1 : 0];
  if (to === 'humanize' && value === 0) {
    return '0 seconds';
  }
  const ratio = TO_SECONDS[from];
  const duration = moment
    .duration(
      value * (ratio ?? 1),
      // Moment's constructors start at milliseconds; smaller units are scaled to seconds.
      ratio === undefined
        ? (from as moment.unitOfTime.DurationConstructor)
        : 'seconds'
    )
    .locale('en');
  if (to === 'humanizePrecise') {
    const seconds = duration.as('seconds');
    const magnitude = Math.abs(seconds);
    const [size, method] =
      PRECISE.find(([unitSeconds]) => magnitude / unitSeconds >= 1) ??
      PRECISE.at(-1)!;
    return `${seconds < 0 ? '-' : ''}${(magnitude / size).toFixed(precision)}${space}${unit(method)}`;
  }
  if (to === 'humanize') {
    return `${value < 0 ? 'minus ' : ''}${duration.humanize()}`;
  }
  const reading = Number(duration[to]()).toFixed(precision);
  return showSuffix ? `${reading}${space}${unit(to)}` : reading;
};

/** Formats `value` as Kibana would for the matching Lens format. */
export const formatValue = (value: number, format?: ValueFormat): string => {
  if (format?.kind === 'duration') {
    return formatDuration(value, format);
  }
  const end = format?.suffix ?? '';
  return withEnglish(() => numeral(value).format(toPattern(format))) + end;
};
