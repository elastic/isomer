/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode } from './schema';

/** One tile: a value. */
export const example: MetricNode = {
  type: 'metric',
  tiles: [
    {
      key: 'requests',
      title: 'Requests',
      subtitle: 'Last 24 hours',
      value: 182_340,
      format: { kind: 'number', decimals: 0 },
      color: 'primary',
    },
  ],
};

/** A text reading beside a missing one, painting the value instead of the tile. */
export const textExample: MetricNode = {
  type: 'metric',
  tiles: [
    {
      key: 'top-country',
      title: 'Top country',
      value: 'Portugal',
      color: '#A6EDEA',
    },
    {
      key: 'p99',
      title: 'p99 latency',
      value: null,
      format: { kind: 'number', decimals: 1, suffix: ' ms' },
      color: 'danger',
      colorTarget: 'value',
    },
  ],
};

/** Every example, for galleries and tests. */
export const examples: MetricNode[] = [example, textExample];
