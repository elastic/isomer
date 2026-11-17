/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FORMATS } from '../format/format';
import type { XyChartNode } from '../schema/xy_chart';

import type { Resolution } from './common';
import type { SceneLegendItem } from './types';

type Statistic = NonNullable<
  NonNullable<XyChartNode['legend']>['statistics']
>[number];

const STATISTIC_NAMES: Record<Statistic, string> = {
  min: 'Min',
  max: 'Max',
  avg: 'Average',
  median: 'Median',
  range: 'Range',
  last_value: 'Last value',
  last_non_null_value: 'Last non-null value',
  first_value: 'First value',
  first_non_null_value: 'First non-null value',
  difference: 'Difference',
  difference_percentage: 'Difference %',
  count: 'Count',
  total: 'Total',
  standard_deviation: 'Std deviation',
  variance: 'Variance',
  distinct_count: 'Distinct count',
  current_and_last_value: 'Current and last value',
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[middle]!;
  }
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const moments = (values: number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, deviation: Math.sqrt(variance), variance };
};

const statistic = (
  name: Statistic,
  ys: (number | null)[],
  resolution: Resolution,
  yColumn: string,
  rows: number[]
): string => {
  const present = ys.filter((value): value is number => value !== null);
  const sum = present.reduce((total, value) => total + value, 0);
  const { mean, deviation, variance } = moments(present);
  const first = present[0];
  const last = present[present.length - 1];
  // A sum past the largest double reads as missing, as a series with no values does.
  const finite = (number: number | null | undefined) =>
    typeof number === 'number' && Number.isFinite(number) ? number : null;
  const value = (number: number | null | undefined) =>
    resolution.valueText(yColumn, finite(number));
  const cellText = (index: number | undefined) =>
    index === undefined ? value(null) : resolution.text(yColumn, rows[index]!);
  const presentIndexes = ys.flatMap((y, index) => (y === null ? [] : [index]));
  switch (name) {
    case 'min':
    case 'max': {
      const selected = presentIndexes.reduce<number | undefined>(
        (best, index) =>
          best === undefined ||
          (name === 'min' ? ys[index]! < ys[best]! : ys[index]! > ys[best]!)
            ? index
            : best,
        undefined
      );
      return cellText(selected);
    }
    case 'avg':
      return value(present.length ? mean : null);
    case 'median':
      return value(present.length ? median(present) : null);
    case 'range':
      return value(
        present.length
          ? present.reduce((high, value) => Math.max(high, value), -Infinity) -
              present.reduce((low, value) => Math.min(low, value), Infinity)
          : null
      );
    case 'last_value':
      return cellText(ys.length ? ys.length - 1 : undefined);
    case 'last_non_null_value':
      return cellText(presentIndexes.at(-1));
    case 'first_value':
      return cellText(ys.length ? 0 : undefined);
    case 'first_non_null_value':
      return cellText(presentIndexes[0]);
    case 'difference':
      return value(
        first === undefined || last === undefined ? null : last - first
      );
    case 'difference_percentage':
      return resolution.formatAs(
        first === undefined || last === undefined || first === 0
          ? null
          : finite((last - first) / first),
        DEFAULT_FORMATS.percent
      );
    case 'count':
      return resolution.formatAs(ys.length, DEFAULT_FORMATS.number);
    case 'total':
      return value(present.length ? sum : null);
    case 'standard_deviation':
      return value(present.length ? deviation : null);
    case 'variance':
      return value(present.length ? variance : null);
    case 'distinct_count':
      return resolution.formatAs(new Set(present).size, DEFAULT_FORMATS.number);
    case 'current_and_last_value':
      return cellText(ys.length ? ys.length - 1 : undefined);
  }
};

/** Each named statistic over a series' `ys`, read from `yColumn` at `rows`, the `ys`' rows. */
export const legendStatistics = (
  names: readonly Statistic[],
  ys: (number | null)[],
  resolution: Resolution,
  yColumn: string,
  rows: number[]
): SceneLegendItem['statistics'] =>
  names.map((name) => ({
    name: STATISTIC_NAMES[name],
    value: statistic(name, ys, resolution, yColumn, rows),
  }));
