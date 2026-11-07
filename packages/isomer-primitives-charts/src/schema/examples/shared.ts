/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PortableFormat } from '../format';

/** A number with up to three fraction digits. */
export const NUMBER: PortableFormat = {
  kind: 'number',
  maximumFractionDigits: 3,
};
/** A percent with up to three fraction digits. */
export const PERCENT: PortableFormat = {
  kind: 'percent',
  maximumFractionDigits: 3,
};
/** Bytes with up to one fraction digit. */
export const BYTES: PortableFormat = {
  kind: 'bytes',
  maximumFractionDigits: 1,
};

/** One hour in milliseconds. */
export const HOUR = 3_600_000;
/** The first timestamp of the time-series examples, 2026-11-03 UTC. */
export const START = Date.UTC(2026, 10, 3);
