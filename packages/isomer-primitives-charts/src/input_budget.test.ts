/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { type Composition, MAX_INPUT_VALUES } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { CHARTS_INPUT_BUDGET, chartsPack } from './pack';
import { xyTimeSeries } from './schema/examples/xy_chart';
import type { XyChartNode } from './schema/xy_chart';

// The SDK's rule, restated: every object, array and leaf counts once.
const countValues = (value: unknown): number =>
  value !== null && typeof value === 'object'
    ? 1 + Object.values(value).reduce<number>((n, v) => n + countValues(v), 0)
    : 1;

const HOUR = 3_600_000;

/** An xy composition of exactly `values` values. */
const compositionOf = (values: number): Composition => {
  const node = (rows: number, extra: number): XyChartNode => ({
    ...xyTimeSeries,
    ...(extra > 0 && { description: 'Padding.' }),
    ...(extra > 1 && { id: 'padded' }),
    data: {
      ...xyTimeSeries.data,
      rows: Array.from({ length: rows }, (_, index) => [index * HOUR, index]),
    },
  });
  const view = (rows: number, extra: number): Composition => ({
    type: 'view',
    body: [node(rows, extra)],
  });
  const base = countValues(view(0, 0));
  // Each row is an array of two cells: three values.
  const rows = Math.floor((values - base) / 3);
  const extra = values - base - rows * 3;
  const composition = view(rows, extra);
  expect(countValues(composition)).toBe(values);
  return composition;
};

describe('the charts pack input budget', () => {
  const runtime = createIsomerRuntime({ packs: [chartsPack] });

  it('is larger than the SDK default', () => {
    expect(CHARTS_INPUT_BUDGET.values).toBeGreaterThan(MAX_INPUT_VALUES);
  });

  it('validates a composition at the budget', () => {
    const result = runtime.validate(compositionOf(CHARTS_INPUT_BUDGET.values));
    expect(result.errors).toEqual([]);
  });

  it('refuses one value past it', () => {
    const [error] = runtime.validate(
      compositionOf(CHARTS_INPUT_BUDGET.values + 1)
    ).errors;
    expect(error?.code).toBe('INPUT_OVER_BUDGET');
  });

  it('yields to a budget the host sets', () => {
    const strict = createIsomerRuntime({
      packs: [chartsPack],
      inputBudget: { values: MAX_INPUT_VALUES },
    });
    expect(
      strict.validate(compositionOf(MAX_INPUT_VALUES + 1)).errors[0]?.code
    ).toBe('INPUT_OVER_BUDGET');
  });
});
