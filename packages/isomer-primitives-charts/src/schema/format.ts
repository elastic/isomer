/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Formats are ECMA-402 (`Intl`) options, so they mean the same thing to every
// renderer. Text no format describes travels as `data.display` strings.

import { z } from '@elastic/isomer-sdk';

import { crossSuperRefine } from './cross_field';

/** The cross-field rules `portableFormatSchema` states in its description, one sentence each. */
export const FORMAT_RULES = {
  dateStyle:
    'A date format uses `dateStyle` and `timeStyle`, or individual date and time fields, not both.',
  timeZone:
    'A date format’s `timeZone` is an IANA time zone or an offset that `Intl.DateTimeFormat` accepts.',
} as const;

const isTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
};

const fractionDigits = z.int().min(0).max(20);

// Shared by every number-like kind, as `Intl.NumberFormat` takes them.
const numberShape = {
  minimumFractionDigits: fractionDigits.optional(),
  maximumFractionDigits: fractionDigits
    .optional()
    .describe(
      'Absent means `Intl.NumberFormat`’s default for the kind. Below `minimumFractionDigits`, it is raised to it.'
    ),
  signDisplay: z
    .enum(['auto', 'always', 'exceptZero', 'never'])
    .optional()
    .describe(
      '`exceptZero` prefixes `+` to positive values that do not round to zero. Absent means `auto`.'
    ),
  useGrouping: z
    .boolean()
    .optional()
    .describe('Group thousands. Absent means true.'),
  suffix: z
    .string()
    .optional()
    .describe('Text appended to the formatted value.'),
};

const unitDisplay = z
  .enum(['long', 'short', 'narrow'])
  .optional()
  .describe('How unit names display, as `Intl.NumberFormat`’s `unitDisplay`.');

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

/** A unit a duration displays in. */
export type DurationOutputUnit = (typeof DURATION_OUTPUT_UNITS)[number];

const twoDigit = z.enum(['numeric', '2-digit']);

const dateSchema = z
  .strictObject({
    kind: z.literal('date'),
    timeZone: z
      .string()
      .check(
        crossSuperRefine<string>(
          (timeZone, context) => {
            if (typeof timeZone === 'string' && !isTimeZone(timeZone)) {
              context.addIssue({
                code: 'custom',
                message: FORMAT_RULES.timeZone,
              });
            }
          },
          [FORMAT_RULES.timeZone]
        )
      )
      .optional()
      .describe(
        `An IANA time zone such as \`Europe/Paris\`, \`UTC\`, or an offset such as \`+05:30\`. Absent means the time zone the chart is resolved in. ${FORMAT_RULES.timeZone}`
      ),
    dateStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
    timeStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
    weekday: z.enum(['long', 'short', 'narrow']).optional(),
    year: twoDigit.optional(),
    month: z.enum(['numeric', '2-digit', 'long', 'short', 'narrow']).optional(),
    day: twoDigit.optional(),
    hour: twoDigit.optional(),
    minute: twoDigit.optional(),
    second: twoDigit.optional(),
    fractionalSecondDigits: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional(),
    hour12: z.boolean().optional().describe('Absent means the locale’s clock.'),
    timeZoneName: z
      .enum(['short', 'long', 'shortOffset', 'longOffset'])
      .optional(),
  })
  .describe(
    `Dates as \`Intl.DateTimeFormat\` formats them in the chart's locale. With no style or field, a medium date and time. ${FORMAT_RULES.dateStyle}`
  )
  .check(
    crossSuperRefine<{ dateStyle?: unknown; timeStyle?: unknown }>(
      (format, context) => {
        const styled =
          format.dateStyle !== undefined || format.timeStyle !== undefined;
        const fields = Object.entries(format).some(
          ([key, value]) =>
            value !== undefined &&
            !['kind', 'timeZone', 'dateStyle', 'timeStyle', 'hour12'].includes(
              key
            )
        );
        if (styled && fields) {
          context.addIssue({
            code: 'custom',
            path: [format.dateStyle !== undefined ? 'dateStyle' : 'timeStyle'],
            message: FORMAT_RULES.dateStyle,
          });
        }
      },
      [FORMAT_RULES.dateStyle]
    )
  );

/**
 * How a column formats its values, as ECMA-402 `Intl` options. Formats
 * outside this set arrive as pre-rendered `data.display` strings with a
 * `losses` entry.
 */
export const portableFormatSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('number'),
      ...numberShape,
      notation: z
        .enum(['standard', 'compact'])
        .optional()
        .describe('`compact` shortens large numbers, such as 1.2K.'),
    }),
    z.strictObject({
      kind: z.literal('percent'),
      ...numberShape,
      fractional: z
        .boolean()
        .optional()
        .describe(
          'Whether values are fractions (0.35 is 35%). `false` means they are already percentages. Absent means true.'
        ),
    }),
    z
      .strictObject({
        kind: z.literal('bytes'),
        ...numberShape,
        base: z
          .union([z.literal(1000), z.literal(1024)])
          .optional()
          .describe('Bytes per kilobyte. Absent means 1024.'),
        unitDisplay,
      })
      .describe('A byte count in the largest unit, up to petabytes.'),
    z
      .strictObject({
        kind: z.literal('bits'),
        ...numberShape,
        base: z
          .union([z.literal(1000), z.literal(1024)])
          .optional()
          .describe('Bits per kilobit. Absent means 1000.'),
        unitDisplay,
      })
      .describe('A bit count in the largest unit, up to terabits.'),
    z.strictObject({
      kind: z.literal('duration'),
      input: z
        .enum(DURATION_INPUT_UNITS)
        .describe('The unit the raw value is stored in.'),
      output: z
        .union([z.enum(DURATION_OUTPUT_UNITS), z.literal('auto')])
        .optional()
        .describe(
          'The unit to display in, or `auto` for the largest unit the value is at least one of. A month is 30 days and a year 365. Absent means `auto`.'
        ),
      ...numberShape,
      unitDisplay,
    }),
    dateSchema,
    z.strictObject({ kind: z.literal('text') }),
  ])
  .describe(
    'How a column formats its values, as `Intl` options, in the locale the chart is resolved in. Formats outside this set arrive as pre-rendered `data.display` strings with a `losses` entry.'
  );

/** A format a renderer applies to a column's values. */
export type PortableFormat = z.infer<typeof portableFormatSchema>;
