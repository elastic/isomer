/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PortableFormat } from '../format';

export const NUMBER: PortableFormat = {
  kind: 'number',
  maximumFractionDigits: 3,
};
export const PERCENT: PortableFormat = {
  kind: 'percent',
  maximumFractionDigits: 3,
};
export const BYTES: PortableFormat = {
  kind: 'bytes',
  maximumFractionDigits: 1,
};

export const HOUR = 3_600_000;
export const START = Date.UTC(2026, 10, 3);
