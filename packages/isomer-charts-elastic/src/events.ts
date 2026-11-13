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
  type HeatmapScene,
  type MetricScene,
  type PartitionNode,
  type PartitionScene,
  type SceneRenderEnv,
  selectEvent,
  type TagCloudScene,
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

/** Whether an Elastic Charts datum is one this engine passed it. */
export const isXyDatum = (value: unknown): value is XyDatum =>
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

/** The bucket width Elastic Charts draws a stated `interval` at: no wider than the positions' smallest spacing. */
const bucketOf = ({ axes: { x }, categories }: XyScene): number | undefined => {
  if (x.interval === undefined) {
    return undefined;
  }
  const xs = categories
    .map((category) => category.x)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  return Math.min(
    x.interval,
    ...xs.slice(1).map((value, index) => value - xs[index]!)
  );
};

/** The category whose bucket holds `x`: the position itself, or, on an axis stating an `interval`, the one starting less than a {@link bucketOf bucket} before it. */
export const categoryAt = (
  scene: XyScene,
  x: unknown
): XyCategory | undefined => {
  const { categories } = scene;
  const exact = categories.find((category) => category.x === x);
  const bucket = bucketOf(scene);
  if (exact || typeof x !== 'number' || bucket === undefined) {
    return exact;
  }
  return categories.find(
    (category) =>
      typeof category.x === 'number' &&
      category.x <= x &&
      x < category.x + bucket
  );
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

const sliceNamed = (
  nodes: readonly PartitionNode[],
  key: string
): PartitionNode | undefined => {
  for (const node of nodes) {
    const found = node.key === key ? node : sliceNamed(node.children, key);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/** The handlers this engine passes Elastic Charts for a partition Scene; empty when the chart offers nothing. */
export const partitionHandlers = (
  scene: PartitionScene,
  env: SceneRenderEnv
) => {
  if (
    !listening(env) ||
    !(scene.interactions.select as readonly string[]).includes('slice')
  ) {
    return {};
  }
  return {
    /** The innermost slice of the first element: the one the reader hit, as Kibana's partition click takes it. */
    onElementClick: (elements: readonly unknown[]) => {
      const [first] = elements;
      const [layers]: readonly unknown[] = Array.isArray(first)
        ? (first as readonly unknown[])
        : [];
      const hit = Array.isArray(layers)
        ? (layers as readonly { groupByRollup?: unknown }[]).at(-1)
        : undefined;
      const key = hit?.groupByRollup;
      const selection =
        typeof key === 'string'
          ? sliceNamed(scene.nodes, key)?.selection
          : undefined;
      if (selection) {
        raise(env, selectEvent(env.nodeId, selection));
      }
    },
  };
};

/** Raises the `slice` selection of the legend item for the slice `key` names. */
export const partitionLegendSelect = (
  scene: PartitionScene,
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

/** The handlers this engine passes Elastic Charts for a heatmap Scene; empty when the chart offers nothing. */
export const heatmapHandlers = (scene: HeatmapScene, env: SceneRenderEnv) => {
  if (!listening(env)) {
    return {};
  }
  const { select, brush } = scene.interactions;
  return {
    ...((select as readonly string[]).includes('cell')
      ? {
          /** The first cell Elastic Charts reports: its datum's index is the Scene cell's. */
          onElementClick: (elements: readonly unknown[]) => {
            const [first] = elements;
            const [cell]: readonly unknown[] = Array.isArray(first)
              ? (first as readonly unknown[])
              : [];
            const index = (
              cell as { datum?: { originalIndex?: unknown } } | undefined
            )?.datum?.originalIndex;
            const selection =
              typeof index === 'number'
                ? scene.cells[index]?.selection
                : undefined;
            if (selection) {
              raise(env, selectEvent(env.nodeId, selection));
            }
          },
        }
      : {}),
    ...(brush && scene.x.scale === 'time'
      ? {
          /** A drag across the time axis: from the first bucket's start to the last's end. */
          onBrushEnd: (area: { x?: unknown }) => {
            const xs: readonly unknown[] = Array.isArray(area.x)
              ? (area.x as readonly unknown[])
              : [];
            const [from, to] = [xs[0], xs.at(-1)];
            if (typeof from === 'number' && typeof to === 'number') {
              raise(env, brushEvent(scene, env.nodeId, [from, to]));
            }
          },
        }
      : {}),
  };
};

/** The handlers this engine passes Elastic Charts for a tag cloud Scene; empty when the chart offers nothing. */
export const tagCloudHandlers = (scene: TagCloudScene, env: SceneRenderEnv) => {
  if (
    !listening(env) ||
    !(scene.interactions.select as readonly string[]).includes('tag')
  ) {
    return {};
  }
  return {
    /** The word Elastic Charts reports: its datum names the Scene word. */
    onElementClick: (elements: readonly unknown[]) => {
      const [first] = elements;
      const [datum]: readonly unknown[] = Array.isArray(first)
        ? (first as readonly unknown[])
        : [];
      const index = (datum as { index?: unknown } | undefined)?.index;
      const selection =
        typeof index === 'number' ? scene.words[index]?.selection : undefined;
      if (selection) {
        raise(env, selectEvent(env.nodeId, selection));
      }
    },
  };
};
