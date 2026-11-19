/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  brushEvent,
  type SceneRenderEnv,
  selectEvent,
  type XyCategory,
  type XyMark,
  type XyScene,
  type XySeries,
} from '@elastic/isomer-primitives-charts/scene';

import {
  type Handlers,
  listening,
  raise,
  subjectOf,
} from '../../shared/events';

/** What each datum this engine passes Elastic Charts carries, so a hit names its mark. */
export interface XyDatum {
  readonly x: number | string;
  readonly y: number | null;
  /** The series' index in {@link seriesOf}. */
  readonly series: number;
  /** The mark's index in its series' `marks`. */
  readonly mark: number;
}

/** Whether an Elastic Charts datum is one this engine passed it. */
export const isXyDatum = (value: unknown): value is XyDatum =>
  typeof value === 'object' &&
  value !== null &&
  'series' in value &&
  typeof value.series === 'number' &&
  'mark' in value &&
  typeof value.mark === 'number';

/** The Scene's series, in draw order, without its reference lines and annotations. */
export const seriesOf = (scene: XyScene): readonly XySeries[] =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );

/** A series' spec id. Elastic Charts keeps a reader's hidden series by spec id, so it names the series in its node, not its position. */
export const seriesSpecId = ({ key, series: { layer, y } }: XySeries): string =>
  `series-${layer}-${y}-${key}`;

/** The Scene mark an Elastic Charts geometry value was drawn from. */
export const markOf = (scene: XyScene, datum: unknown): XyMark | undefined =>
  isXyDatum(datum)
    ? seriesOf(scene)[datum.series]?.marks[datum.mark]
    : undefined;

/** The bucket width Elastic Charts draws a stated `interval` at: no wider than the positions' smallest spacing. */
const bucketOf = (interval: number, categories: XyScene['categories']) => {
  const xs = categories
    .map((category) => category.x)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  return xs.reduce(
    (bucket, value, index) =>
      index === 0 ? bucket : Math.min(bucket, value - xs[index - 1]!),
    interval
  );
};

/** The category whose bucket holds `x`: the position itself, or, on an axis stating an `interval`, the one starting less than a {@link bucketOf bucket} before it. */
export const categoryAt = (
  scene: XyScene,
  x: unknown
): XyCategory | undefined => {
  const { categories } = scene;
  const exact = categories.find((category) => category.x === x);
  const { interval } = scene.axes.x;
  if (exact || typeof x !== 'number' || interval === undefined) {
    return exact;
  }
  const bucket = bucketOf(interval, categories);
  return categories.find(
    (category) =>
      typeof category.x === 'number' &&
      category.x <= x &&
      x < category.x + bucket
  );
};

/** The handlers this engine passes Elastic Charts for an xy Scene; empty when the chart offers nothing. */
export const xyHandlers = (scene: XyScene, env: SceneRenderEnv): Handlers => {
  if (!listening(env)) {
    return {};
  }
  const { select, brush } = scene.interactions;
  const category = (x: unknown) => categoryAt(scene, x)?.selection;
  return {
    ...(select.includes('datum') || select.includes('category')
      ? {
          /** The first element Elastic Charts reports, as Kibana's xy click handler takes it. */
          onElementClick: ([first]) => {
            const geometry = subjectOf(first);
            const mark =
              geometry && 'accessor' in geometry
                ? markOf(scene, geometry.datum)
                : undefined;
            const selection = select.includes('datum')
              ? mark?.selection
              : category(mark?.x);
            if (selection) {
              raise(env, selectEvent(env.nodeId, selection));
            }
          },
        }
      : {}),
    ...(select.includes('category')
      ? {
          onProjectionClick: ({ x }) => {
            const selection = category(x);
            if (selection) {
              raise(env, selectEvent(env.nodeId, selection));
            }
          },
        }
      : {}),
    ...(brush
      ? {
          onBrushEnd: ({ x = [] }) => {
            const [from, to] = x;
            if (typeof from === 'number' && typeof to === 'number') {
              raise(env, brushEvent(scene, env.nodeId, [from, to]));
            }
          },
        }
      : {}),
  };
};

/** Raises the `legend` selection of `series`' legend item. */
export const legendSelect = (
  scene: XyScene,
  env: SceneRenderEnv,
  { key, series: { layer, y } }: XySeries,
  negate: boolean
): void => {
  const selection = scene.legend.items.find(
    (item) =>
      item.key === key && item.series.layer === layer && item.series.y === y
  )?.selection;
  if (selection && listening(env)) {
    raise(env, selectEvent(env.nodeId, selection, negate));
  }
};
