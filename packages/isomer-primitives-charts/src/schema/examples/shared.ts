/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PortableFormat } from '../format';

// Kibana's default patterns (`format:number:defaultPattern` and siblings).
export const NUMBER: PortableFormat = { kind: 'number', pattern: '0,0.[000]' };
export const PERCENT: PortableFormat = {
  kind: 'percent',
  pattern: '0,0.[000]%',
};
export const BYTES: PortableFormat = { kind: 'bytes', pattern: '0,0.[0]b' };

export const HOUR = 3_600_000;
export const START = Date.UTC(2026, 10, 3);
