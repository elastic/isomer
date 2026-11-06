/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Events from what a renderer hit, so every renderer raises the same event for
// the same gesture. Everything an event says comes from the Scene.

import { coordinateOf } from '../coordinates';
import type { ChartBrushEvent, ChartSelectEvent } from '../schema/events';

import type { SceneSelection, XyScene } from './types';

/** The `select` event for a part of the Scene the reader selected. */
export const selectEvent = (
  node: string,
  selection: SceneSelection,
  negate = false
): ChartSelectEvent => {
  const event = {
    kind: 'select' as const,
    node,
    rows: [...selection.rows],
    columns: [...selection.columns],
    values: Object.fromEntries(
      Object.entries(selection.values).map(([column, value]) => [
        column,
        Array.isArray(value) ? [...value] : value,
      ])
    ),
    description: selection.description,
    ...(negate ? { negate } : {}),
  };
  if (
    selection.target === 'datum' ||
    selection.target === 'series' ||
    selection.target === 'legend'
  ) {
    return {
      ...event,
      target: selection.target,
      series: { ...selection.series },
      seriesKey: selection.seriesKey,
    };
  }
  return { ...event, target: selection.target };
};

interface Endpoint {
  value: number;
  label: string;
}

const nearest = (
  points: readonly Endpoint[],
  at: number
): Endpoint | undefined =>
  points.reduce<Endpoint | undefined>((best, point) => {
    const distance = Math.abs(point.value - at);
    const previous = best === undefined ? Infinity : Math.abs(best.value - at);
    return best === undefined ||
      distance < previous ||
      (distance === previous && point.value < best.value)
      ? point
      : best;
  }, undefined);

/**
 * The `brush` event for a range along the Scene's brush column, or `undefined`
 * when the node offers no brush. Endpoint labels come from the brush column.
 */
export const brushEvent = (
  scene: XyScene,
  node: string,
  range: readonly [number, number]
): ChartBrushEvent | undefined => {
  const brush = scene.interactions.brush;
  if (brush === undefined) {
    return undefined;
  }
  const from = Math.min(range[0], range[1]);
  const to = Math.max(range[0], range[1]);
  const index = scene.table.columns.findIndex(({ id }) => id === brush.column);
  const column = scene.table.columns[index];
  const label = column?.label ?? brush.column;
  const plotted = new Set(
    scene.layers.flatMap((layer) =>
      layer.kind === 'series'
        ? layer.series.marks.flatMap(({ source }) => source.rows)
        : []
    )
  );
  const points = scene.table.rows.flatMap(
    ({ row, values, cells }): Endpoint[] => {
      if (!plotted.has(row)) {
        return [];
      }
      const value = coordinateOf(
        values[index],
        column?.type === 'date' ? 'temporal' : 'linear'
      );
      return value === undefined ? [] : [{ value, label: cells[index] ?? '' }];
    }
  );
  const ends = [nearest(points, from), nearest(points, to)];
  const description =
    ends[0] && ends[1]
      ? `${label}: ${ends[0].label} to ${ends[1].label}`
      : label;
  return {
    kind: 'brush',
    node,
    column: brush.column,
    range: [from, to],
    values: {},
    description,
  };
};
