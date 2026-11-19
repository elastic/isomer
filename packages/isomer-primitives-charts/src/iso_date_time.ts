/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|([+-])(\d{2}):?(\d{2}))$/;

/**
 * The instant an ISO 8601 date-time with a UTC offset names, in epoch
 * milliseconds, computed without `Date.parse`. `undefined` for any other
 * string, including a calendar-invalid one such as February 30.
 */
export const isoDateTimeEpoch = (value: string): number | undefined => {
  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    return undefined;
  }
  const [, , , , , , , fraction, sign] = match;
  const [year, month, day, hour, minute, second, , , offsetHour, offsetMinute] =
    match.slice(1).map((part) => Number(part ?? 0)) as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth =
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ??
    0;
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return undefined;
  }
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(
    hour,
    minute,
    second,
    Number((fraction ?? '').padEnd(3, '0').slice(0, 3))
  );
  const offset = (offsetHour * 60 + offsetMinute) * 60_000;
  return instant.getTime() - (sign === '-' ? -offset : offset);
};
