/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MetricReading,
  MetricTile,
  MetricTrendModel,
} from './declarations';

type Operation = NonNullable<MetricTrendModel['collapse']>['operation'];
type SeriesName = 'primary' | 'secondary';

/** Missing contributors are ignored, but an entirely missing bucket stays missing. */
function aggregate(
  values: (number | null)[],
  operation: Operation
): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) {
    return null;
  }
  let result: number;
  switch (operation) {
    case 'min':
      result = Math.min(...present);
      break;
    case 'max':
      result = Math.max(...present);
      break;
    case 'avg':
      result = present.reduce((sum, value) => sum + value / present.length, 0);
      break;
    case 'sum':
      result = present.reduce((sum, value) => sum + value, 0);
      break;
  }
  if (!Number.isFinite(result)) {
    throw new RangeError('Metric collapse produced a non-finite value');
  }
  return result;
}

function numericValue(
  value: MetricReading['value'] | undefined
): number | null {
  return typeof value === 'number' ? value : null;
}

function collapseSeries(
  tiles: MetricTile[],
  name: SeriesName,
  operation: Operation
) {
  const series = tiles.map(
    (tile) =>
      new Map(
        tile.trend?.[name]?.map((point) => [point.time, point.value]) ?? []
      )
  );
  const times = [
    ...new Set(series.flatMap((values) => [...values.keys()])),
  ].sort((a, b) => a - b);
  return times.map((time) => ({
    time,
    value: aggregate(
      series.map((values) => values.get(time) ?? null),
      operation
    ),
  }));
}

/**
 * Resolve display tiles from a model validated by `metricTrendSchema`.
 * Without collapse, returns the original tile array. Otherwise returns one new
 * tile, aggregating homogeneous numeric sources and trends by UTC instant.
 * Missing contributors are ignored; all-missing groups remain null. Static
 * maxima are retained, otherwise maxima use the selected operation.
 * Source objects are not mutated. This is presentation aggregation, not planning.
 * @throws {RangeError} If aggregate arithmetic overflows.
 */
export function metricTiles(node: MetricTrendModel): MetricTile[] {
  if (!node.collapse) {
    return node.tiles;
  }
  const { operation, label, max } = node.collapse;
  const first = node.tiles[0]!;
  const collapsed: MetricTile = {
    ...first,
    key: 'collapsed',
    title: label,
    primary: {
      ...first.primary,
      value: aggregate(
        node.tiles.map((tile) => numericValue(tile.primary.value)),
        operation
      ),
    },
  };
  if (first.secondary) {
    collapsed.secondary = {
      ...first.secondary,
      value: aggregate(
        node.tiles.map((tile) => numericValue(tile.secondary?.value)),
        operation
      ),
    };
  }
  if (first.progress) {
    const maximum =
      max === 'static'
        ? first.progress.max
        : aggregate(
            node.tiles.map((tile) => tile.progress!.max),
            operation
          )!;
    collapsed.progress = { ...first.progress, max: maximum };
  }
  if (first.trend) {
    collapsed.trend = {
      ...first.trend,
      primary: collapseSeries(node.tiles, 'primary', operation),
    };
    if (first.trend.secondary) {
      collapsed.trend.secondary = collapseSeries(
        node.tiles,
        'secondary',
        operation
      );
    }
  }
  return [collapsed];
}

/** Only values, keys and tile titles may differ across collapse sources. */
export function collapseSignature(
  tile: MetricTile,
  staticMaximum: boolean
): string {
  let secondary;
  if (tile.secondary) {
    secondary = { ...tile.secondary, value: null };
  }
  let progress;
  if (tile.progress) {
    progress = {
      ...tile.progress,
      max: staticMaximum ? tile.progress.max : null,
    };
  }
  let trend;
  if (tile.trend) {
    trend = {
      timeZone: tile.trend.timeZone,
      gap: tile.trend.gap,
      shape: tile.trend.shape,
      secondary: Boolean(tile.trend.secondary),
    };
  }
  return JSON.stringify({
    primary: { label: tile.primary.label, format: tile.primary.format },
    secondary,
    progress,
    trend,
    tone: tile.tone,
    color: tile.color,
    icon: tile.icon,
  });
}
