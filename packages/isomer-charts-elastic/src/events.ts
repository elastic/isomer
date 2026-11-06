/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Elastic Charts' callbacks to `ChartEvent`s. A callback names what Elastic
// Charts hit (a datum this engine passed it, a tile's grid cell, a projected x
// or a brushed range); the event comes from the Scene part it names, never from
// Elastic Charts' own indexes or values.

import {
  brushEvent,
  type ChartEvent,
  type MetricScene,
  type SceneRenderEnv,
  selectEvent,
  type XyCategory,
  type XyMark,
  type XyScene,
  type XySeries,
} from '@elastic/isomer-primitives-charts/scene';

/** What each datum this engine passes Elastic Charts carries, so a hit names its mark. */
export interface XyDatum {
  readonly x: number | string;
  readonly y: number | null;
  /** The series' index in {@link seriesOf}. */
  readonly series: number;
  /** The mark's index in its series' `marks`. */
  readonly mark: number;
}

const isXyDatum = (value: unknown): value is XyDatum =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as XyDatum).series === 'number' &&
  typeof (value as XyDatum).mark === 'number';

/** The Scene's series, in draw order, without its reference lines and annotations. */
export const seriesOf = (scene: XyScene): readonly XySeries[] =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );

/** The Scene mark an Elastic Charts geometry value was drawn from. */
export const markOf = (scene: XyScene, datum: unknown): XyMark | undefined =>
  isXyDatum(datum)
    ? seriesOf(scene)[datum.series]?.marks[datum.mark]
    : undefined;

/** The category at `x`: the position itself on an ordinal axis, else the last at or before it. */
export const categoryAt = (
  scene: XyScene,
  x: unknown
): XyCategory | undefined => {
  if (typeof x === 'string') {
    return scene.categories.find((category) => category.x === x);
  }
  if (typeof x !== 'number') {
    return undefined;
  }
  let found: XyCategory | undefined;
  for (const category of scene.categories) {
    if (typeof category.x === 'number' && category.x <= x) {
      found = category;
    }
  }
  return found;
};

/** Whether the host can receive events from this Scene. */
const listening = (
  env: SceneRenderEnv
): env is SceneRenderEnv & {
  nodeId: string;
  onEvent: (event: ChartEvent) => void;
} => env.nodeId !== undefined && env.onEvent !== undefined;

const raise = (env: SceneRenderEnv, event: ChartEvent | undefined): void => {
  if (event !== undefined && listening(env)) {
    env.onEvent(event);
  }
};

/** The handlers this engine passes Elastic Charts for an xy Scene; empty when the chart offers nothing. */
export const xyHandlers = (scene: XyScene, env: SceneRenderEnv) => {
  if (!listening(env)) {
    return {};
  }
  const { select, brush } = scene.interactions;
  const offers = (target: string) =>
    (select as readonly string[]).includes(target);
  const category = (x: unknown) => categoryAt(scene, x)?.selection;
  return {
    ...(offers('datum') || offers('category')
      ? {
          /** The first element Elastic Charts reports, as Kibana's xy click handler takes it. */
          onElementClick: (elements: readonly unknown[]) => {
            const [first] = elements;
            const [geometry]: readonly unknown[] = Array.isArray(first)
              ? (first as readonly unknown[])
              : [];
            const datum = (geometry as { datum?: unknown } | undefined)?.datum;
            const mark = markOf(scene, datum);
            const selection = offers('datum')
              ? mark?.selection
              : category(mark?.x);
            if (selection) {
              raise(env, selectEvent(env.nodeId, selection));
            }
          },
        }
      : {}),
    ...(offers('category')
      ? {
          onProjectionClick: ({ x }: { x: unknown; y?: unknown }) => {
            const selection = category(x);
            if (selection) {
              raise(env, selectEvent(env.nodeId, selection));
            }
          },
        }
      : {}),
    ...(brush
      ? {
          onBrushEnd: (area: { x?: unknown }) => {
            const [from, to]: readonly unknown[] = Array.isArray(area.x)
              ? (area.x as readonly unknown[])
              : [];
            if (typeof from === 'number' && typeof to === 'number') {
              raise(env, brushEvent(scene, env.nodeId, [from, to]));
            }
          },
        }
      : {}),
  };
};

/** Raises the `legend` selection of the legend item for series `key`. */
export const legendSelect = (
  scene: XyScene,
  env: SceneRenderEnv,
  key: string,
  negate: boolean
): void => {
  const selection = scene.legend.items.find(
    (item) => item.key === key
  )?.selection;
  if (selection && listening(env)) {
    raise(env, selectEvent(env.nodeId, selection, negate));
  }
};

/** The handlers this engine passes Elastic Charts for a metric Scene; empty when the chart offers nothing. */
export const metricHandlers = (scene: MetricScene, env: SceneRenderEnv) => {
  if (
    !listening(env) ||
    !(scene.interactions.select as readonly string[]).includes('tile')
  ) {
    return {};
  }
  return {
    onElementClick: (elements: readonly unknown[]) => {
      for (const element of elements) {
        const cell = element as {
          type?: string;
          rowIndex?: number;
          columnIndex?: number;
        };
        if (
          cell.type !== 'metricElementEvent' ||
          cell.rowIndex === undefined ||
          cell.columnIndex === undefined
        ) {
          continue;
        }
        const tile =
          scene.tiles[cell.rowIndex * scene.layout.columns + cell.columnIndex];
        if (tile?.selection) {
          raise(env, selectEvent(env.nodeId, tile.selection));
        }
      }
    },
  };
};
