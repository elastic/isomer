/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Events from what a renderer hit, so every renderer raises the same event for
// the same gesture. Everything an event says comes from the Scene.

import type { ChartBrushEvent, ChartSelectEvent } from '../schema/events';

import type {
  HeatmapCategory,
  HeatmapScene,
  SceneSelection,
  XyScene,
} from './types';

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

const nearest = (
  categories: readonly HeatmapCategory[],
  at: number
): HeatmapCategory | undefined => {
  let best: HeatmapCategory | undefined;
  for (const category of categories) {
    if (typeof category.x !== 'number') {
      continue;
    }
    if (
      best === undefined ||
      Math.abs(category.x - at) < Math.abs((best.x as number) - at)
    ) {
      best = category;
    }
  }
  return best;
};

/**
 * The `brush` event for a range along the Scene's brush column, or `undefined`
 * when the node offers no brush. The description names each end by the x
 * position nearest it, as the x axis formats it: an xy Scene's `categories`,
 * or a heat map's `x.categories`.
 */
export const brushEvent = (
  scene: XyScene | HeatmapScene,
  node: string,
  range: readonly [number, number]
): ChartBrushEvent | undefined => {
  const brush = scene.interactions.brush;
  if (brush === undefined) {
    return undefined;
  }
  const from = Math.min(range[0], range[1]);
  const to = Math.max(range[0], range[1]);
  const label =
    scene.table.columns.find(({ id }) => id === brush.column)?.label ??
    brush.column;
  const categories =
    scene.kind === 'heatmap' ? scene.x.categories : scene.categories;
  const ends = [nearest(categories, from), nearest(categories, to)];
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
