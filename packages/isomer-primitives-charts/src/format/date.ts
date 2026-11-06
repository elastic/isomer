/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PortableFormat } from '../schema/format';

import { dateFormat } from './intl';

type DateFormat = Extract<PortableFormat, { kind: 'date' }>;

const DEFAULT_STYLE = { dateStyle: 'medium', timeStyle: 'medium' } as const;

/**
 * Formats an instant with `Intl.DateTimeFormat`. `epoch` is milliseconds since
 * the epoch; the format's `timeZone`, when present, overrides `timeZone`.
 * Throws a `RangeError` for a time zone the environment does not know.
 */
export const formatDate = (
  epoch: number,
  { kind: _kind, timeZone: own, hour12, ...options }: DateFormat,
  { locale, timeZone }: { locale: string; timeZone: string }
): string => {
  const fields = Object.values(options).some((value) => value !== undefined);
  return dateFormat(locale, {
    timeZone: own ?? timeZone,
    hour12,
    ...(fields ? options : DEFAULT_STYLE),
    ...(hour12 === undefined ? {} : { hour12 }),
  }).format(epoch);
};

/**
 * A date cell as epoch milliseconds: a number as it is, or an ISO 8601 string
 * parsed. `undefined` when it is neither.
 */
export const toEpoch = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.abs(value) <= 8.64e15
      ? value
      : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};
