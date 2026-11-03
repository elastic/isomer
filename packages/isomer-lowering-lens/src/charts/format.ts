/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValueFormat } from '@elastic/isomer-primitives-charts/model';

import type { JsonValue } from '../json';

type Mapped =
  { ok: true; format: ValueFormat | undefined } | { ok: false; id: string };

const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Maps a Lens column's `params.format` to a {@link ValueFormat}, as
 * `lens_format_column` and `supportedFormats` build it. No format leaves the
 * host's default number pattern, which the resolver's default reproduces.
 */
export const toValueFormat = (params: unknown): Mapped => {
  const format = isRecord(params) ? params.format : undefined;
  if (!isRecord(format)) {
    return { ok: true, format: undefined };
  }
  const { id } = format;
  const options = isRecord(format.params) ? format.params : {};
  const decimals =
    typeof options.decimals === 'number' ? options.decimals : undefined;
  const compact = options.compact === true ? true : undefined;
  const suffix =
    typeof options.suffix === 'string' && options.suffix !== ''
      ? options.suffix
      : undefined;
  const common = {
    ...(decimals === undefined ? {} : { decimals }),
    ...(suffix === undefined ? {} : { suffix }),
  };
  switch (id) {
    case 'number':
    case 'percent':
      return {
        ok: true,
        format: { kind: id, ...common, ...(compact ? { compact } : {}) },
      };
    case 'bytes':
    case 'bits':
      return { ok: true, format: { kind: id, ...common } };
    case 'custom':
      return typeof options.pattern === 'string' && options.pattern !== ''
        ? {
            ok: true,
            format: {
              kind: 'pattern',
              pattern: options.pattern,
              ...(suffix ? { suffix } : {}),
            },
          }
        : { ok: false, id: 'custom' };
    case 'duration':
      // `supportedFormats.duration.translateToFormatParams`.
      return durationFormat({
        inputFormat: options.fromUnit,
        outputFormat: options.toUnit,
        outputPrecision: decimals,
        useShortSuffix: compact === true,
        showSuffix: true,
        includeSpaceWithSuffix: true,
      });
    default:
      return {
        ok: false,
        id: typeof id === 'string' ? id : JSON.stringify(id),
      };
  }
};

type Duration = Extract<ValueFormat, { kind: 'duration' }>;
type DurationInput = NonNullable<Duration['from']>;
type DurationOutput = NonNullable<Duration['to']>;

const DURATION_INPUTS: ReadonlySet<string> = new Set<DurationInput>([
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
]);
const DURATION_OUTPUTS: ReadonlySet<string> = new Set<DurationOutput>([
  'humanize',
  'humanizePrecise',
  'asMilliseconds',
  'asSeconds',
  'asMinutes',
  'asHours',
  'asDays',
  'asWeeks',
  'asMonths',
  'asYears',
]);

const isInput = (value: unknown): value is DurationInput =>
  typeof value === 'string' && DURATION_INPUTS.has(value);
const isOutput = (value: unknown): value is DurationOutput =>
  typeof value === 'string' && DURATION_OUTPUTS.has(value);

/** `DurationFormat.getParamDefaults`. */
const DURATION_DEFAULTS = {
  inputFormat: 'seconds',
  outputFormat: 'humanize',
  outputPrecision: 2,
  includeSpaceWithSuffix: true,
};

/** A `DurationFormat`'s params, over its defaults, as a `duration` format. */
const durationFormat = (
  overrides: Record<string, JsonValue | undefined>
): Mapped => {
  const params: Record<string, JsonValue | undefined> = {
    ...DURATION_DEFAULTS,
  };
  // `FieldFormat.param` falls back to a default for an unset value.
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  }
  const { inputFormat, outputFormat, outputPrecision } = params;
  if (!isInput(inputFormat) || !isOutput(outputFormat)) {
    return { ok: false, id: 'duration' };
  }
  return {
    ok: true,
    format: {
      kind: 'duration',
      from: inputFormat,
      to: outputFormat,
      ...(typeof outputPrecision === 'number'
        ? { decimals: outputPrecision }
        : {}),
      short: params.useShortSuffix === true,
      showSuffix: params.showSuffix === true,
      spaceBeforeSuffix: params.includeSpaceWithSuffix !== false,
    },
  };
};

/** Kibana's default field format patterns, used when a data view's format sets none. */
const DEFAULT_PATTERNS: Record<string, string> = {
  number: '0,0.[000]',
  percent: '0,0.[000]%',
  bytes: '0,0.[0]b',
};

/**
 * Maps a table column's serialized data view field format, as Lens renders a
 * column it sets no format for. A duration without `formatOverride` reads
 * precisely, as the metric's `enhanceFieldFormat` defaults it.
 */
export const fromFieldFormat = (serialized: unknown): Mapped => {
  if (!isRecord(serialized)) {
    return { ok: true, format: undefined };
  }
  const { id } = serialized;
  const params = isRecord(serialized.params) ? serialized.params : {};
  if (typeof id === 'string' && id in DEFAULT_PATTERNS) {
    const pattern =
      typeof params.pattern === 'string' && params.pattern !== ''
        ? params.pattern
        : DEFAULT_PATTERNS[id]!;
    return id === 'number' && params.pattern === undefined
      ? { ok: true, format: undefined }
      : { ok: true, format: { kind: 'pattern', pattern } };
  }
  if (id === 'duration') {
    return durationFormat(
      params.formatOverride
        ? params
        : {
            outputFormat: 'humanizePrecise',
            outputPrecision: 1,
            useShortSuffix: true,
            ...params,
          }
    );
  }
  return { ok: false, id: typeof id === 'string' ? id : JSON.stringify(id) };
};
