/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

/** The host's `dateFormat` and `dateFormat:tz`, which Kibana reads dates with. */
export interface DateContext {
  /** A moment pattern, such as Kibana's default `MMM D, YYYY @ HH:mm:ss.SSS`. */
  format: string;
  /** An IANA time zone, such as `Europe/Lisbon`. */
  timeZone: string;
}

/** Whether moment-timezone knows the zone; it would otherwise read in UTC. */
export const isKnownTimeZone = (timeZone: string) =>
  moment.tz.zone(timeZone) !== null;

/** A date as Kibana's date format reads it, `moment(value).format` in the host's zone; `undefined` when invalid. */
export const readDate = (
  value: string | number,
  pattern: string,
  timeZone: string
): string | undefined => {
  const date = moment.tz(value, timeZone);
  return date.isValid() ? date.locale('en').format(pattern) : undefined;
};
