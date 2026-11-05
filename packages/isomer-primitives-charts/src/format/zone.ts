/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateFormat } from './intl';

const OFFSET = /([+-])(\d{1,2})(?::?(\d{2}))?(?::(\d{2}))?$/;

/**
 * Minutes east of UTC in `timeZone` at `epoch` (milliseconds). Throws a
 * `RangeError` for a time zone the environment does not know.
 */
export const timeZoneOffset = (epoch: number, timeZone: string): number => {
  const name = dateFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(epoch)
    .find(({ type }) => type === 'timeZoneName')?.value;
  const match = name === undefined ? null : OFFSET.exec(name);
  if (!match) {
    return 0;
  }
  const minutes =
    Number(match[2]) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0) / 60;
  return match[1] === '-' ? -minutes : minutes;
};
