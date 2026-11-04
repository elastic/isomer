/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The `testCase` fixtures of Kibana's duration field format tests
// (src/platform/plugins/shared/field_formats/common/converters/duration.test.ts),
// copied as data. Kibana's `undefined` inputs are `null` here; both format as "(null)".

export interface KibanaDurationCase {
  inputFormat: string;
  outputFormat: string;
  outputPrecision?: number;
  showSuffix?: boolean;
  useShortSuffix?: boolean;
  includeSpaceWithSuffix?: boolean;
  fixtures: { input: number | null; output: string }[];
}

export const kibanaDurationCases: KibanaDurationCase[] = [
  {
    inputFormat: 'seconds',
    outputFormat: 'humanize',
    fixtures: [
      {
        input: 0,
        output: '0 seconds',
      },
      {
        input: -60,
        output: 'minus a minute',
      },
      {
        input: 1,
        output: 'a few seconds',
      },
      {
        input: 60,
        output: 'a minute',
      },
      {
        input: 125,
        output: '2 minutes',
      },
      {
        input: null,
        output: '(null)',
      },
      {
        input: null,
        output: '(null)',
      },
    ],
  },
  {
    inputFormat: 'minutes',
    outputFormat: 'humanize',
    fixtures: [
      {
        input: -60,
        output: 'minus an hour',
      },
      {
        input: 60,
        output: 'an hour',
      },
      {
        input: 125,
        output: '2 hours',
      },
    ],
  },
  {
    inputFormat: 'minutes',
    outputFormat: 'asHours',
    fixtures: [
      {
        input: -60,
        output: '-1.00',
      },
      {
        input: 60,
        output: '1.00',
      },
      {
        input: 125,
        output: '2.08',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    fixtures: [
      {
        input: -60,
        output: '-60',
      },
      {
        input: 60,
        output: '60',
      },
      {
        input: 125,
        output: '125',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 2,
    fixtures: [
      {
        input: -60,
        output: '-60.00',
      },
      {
        input: -32.333,
        output: '-32.33',
      },
      {
        input: 60,
        output: '60.00',
      },
      {
        input: 125,
        output: '125.00',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    showSuffix: true,
    fixtures: [
      {
        input: -60,
        output: '-60 seconds',
      },
      {
        input: -32.333,
        output: '-32 seconds',
      },
    ],
  },
  {
    inputFormat: 'nanoseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '0.00 milliseconds',
      },
      {
        input: 658,
        output: '0.00 milliseconds',
      },
      {
        input: 3857,
        output: '0.00 milliseconds',
      },
    ],
  },
  {
    inputFormat: 'microseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '1.99 milliseconds',
      },
      {
        input: 658,
        output: '0.66 milliseconds',
      },
      {
        input: 3857,
        output: '3.86 milliseconds',
      },
    ],
  },
  {
    inputFormat: 'microseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 1,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '2.0 milliseconds',
      },
      {
        input: 0,
        output: '0.0 milliseconds',
      },
      {
        input: 658,
        output: '0.7 milliseconds',
      },
      {
        input: 3857,
        output: '3.9 milliseconds',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    fixtures: [
      {
        input: 0.1,
        output: '100 milliseconds',
      },
      {
        input: 600,
        output: '10 minutes',
      },
      {
        input: 30,
        output: '30 seconds',
      },
      {
        input: 3000,
        output: '50 minutes',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    useShortSuffix: false,
    fixtures: [
      {
        input: -12,
        output: '-12.00 seconds',
      },
      {
        input: -123,
        output: '-2.05 minutes',
      },
      {
        input: 1,
        output: '1.00 seconds',
      },
      {
        input: 12,
        output: '12.00 seconds',
      },
      {
        input: 123,
        output: '2.05 minutes',
      },
      {
        input: 658,
        output: '10.97 minutes',
      },
      {
        input: 1988,
        output: '33.13 minutes',
      },
      {
        input: 3857,
        output: '1.07 hours',
      },
      {
        input: 123292,
        output: '1.43 days',
      },
      {
        input: 923528271,
        output: '29.28 years',
      },
    ],
  },
  {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: -123,
        output: '-123 ms',
      },
      {
        input: -1230,
        output: '-1 s',
      },
      {
        input: 1,
        output: '1 ms',
      },
      {
        input: 600,
        output: '600 ms',
      },
      {
        input: 30,
        output: '30 ms',
      },
      {
        input: 3000,
        output: '3 s',
      },
      {
        input: 300000,
        output: '5 min',
      },
      {
        input: 30000000,
        output: '8 h',
      },
      {
        input: 90000000,
        output: '1 d',
      },
      {
        input: 9000000000,
        output: '3 mon',
      },
      {
        input: 99999999999,
        output: '3 y',
      },
    ],
  },
  {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: 0.5,
        output: '0.50 ms',
      },
      {
        input: -123.5,
        output: '-123.50 ms',
      },
      {
        input: -123,
        output: '-123.00 ms',
      },
      {
        input: 1,
        output: '1.00 ms',
      },
      {
        input: 600,
        output: '600.00 ms',
      },
      {
        input: 30,
        output: '30.00 ms',
      },
      {
        input: 3000,
        output: '3.00 s',
      },
      {
        input: 300000,
        output: '5.00 min',
      },
      {
        input: 30000000,
        output: '8.33 h',
      },
      {
        input: 90000000,
        output: '1.04 d',
      },
      {
        input: 9000000000,
        output: '3.47 mon',
      },
      {
        input: 99999999999,
        output: '3.17 y',
      },
    ],
  },
  {
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 0.5,
        output: '500.00 milliseconds',
      },
      {
        input: 600,
        output: '10.00 minutes',
      },
      {
        input: 30,
        output: '30.00 seconds',
      },
      {
        input: 3000,
        output: '50.00 minutes',
      },
      {
        input: 604800,
        output: '1.00 weeks',
      },
      {
        input: 907200,
        output: '1.50 weeks',
      },
      {
        input: 691200,
        output: '1.14 weeks',
      },
    ],
  },
  {
    inputFormat: 'hours',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: 0.5,
        output: '30 min',
      },
      {
        input: 339,
        output: '2 w',
      },
    ],
  },
  {
    inputFormat: 'hours',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: 0.1,
        output: '6.00 min',
      },
      {
        input: 12,
        output: '12.00 h',
      },
      {
        input: 24,
        output: '1.00 d',
      },
      {
        input: 339,
        output: '2.02 w',
      },
      {
        input: 500,
        output: '2.98 w',
      },
      {
        input: 1000,
        output: '1.39 mon',
      },
    ],
  },
  {
    inputFormat: 'minutes',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: false,
    useShortSuffix: false,
    fixtures: [
      {
        input: 0.1,
        output: '6.00 seconds',
      },
      {
        input: 100.1,
        output: '1.67 hours',
      },
      {
        input: 10750,
        output: '1.07 weeks',
      },
    ],
  },
  {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    useShortSuffix: true,
    includeSpaceWithSuffix: false,
    fixtures: [
      {
        input: 0.5,
        output: '1ms',
      },
      {
        input: -123,
        output: '-123ms',
      },
      {
        input: 1,
        output: '1ms',
      },
      {
        input: 600,
        output: '600ms',
      },
    ],
  },
];
