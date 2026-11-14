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
  type BrushEndListener,
  type ElementClickListener,
  isMetricElementEvent,
  type ProjectionClickListener,
} from '@elastic/charts';
import {
  brushEvent,
  type ChartEvent,
  type HeatmapScene,
  type MetricScene,
  type PartitionNode,
  type PartitionScene,
  type SceneRenderEnv,
  selectEvent,
  type SelectTarget,
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
  'series' in value &&
  typeof value.series === 'number' &&
  'mark' in value &&
  typeof value.mark === 'number';

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

type ListeningEnv = SceneRenderEnv & {
  nodeId: string;
  onEvent: (event: ChartEvent) => void;
};

/** Whether the host can receive events from this Scene. */
const listening = (env: SceneRenderEnv): env is ListeningEnv =>
  env.nodeId !== undefined && env.onEvent !== undefined;

/** Whether the host can receive the Scene's selections of `target`. */
export const offers = (
  { interactions: { select } }: { interactions: XyScene['interactions'] },
  env: SceneRenderEnv,
  target: SelectTarget
): env is ListeningEnv => listening(env) && select.includes(target);

const raise = (env: ListeningEnv, event: ChartEvent | undefined): void => {
  if (event !== undefined) {
    env.onEvent(event);
  }
};

/** The first member of a tuple element: what was hit. The metric element is no tuple. */
const subjectOf = (
  element: Parameters<ElementClickListener>[0][number] | undefined
) => (Array.isArray(element) ? element[0] : undefined);

interface Handlers {
  onElementClick?: ElementClickListener;
  onProjectionClick?: ProjectionClickListener;
  onBrushEnd?: BrushEndListener;
}

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

/** The handlers this engine passes Elastic Charts for a metric Scene; empty when the chart offers nothing. */
export const metricHandlers = (
  scene: MetricScene,
  env: SceneRenderEnv
): Handlers => {
  if (!offers(scene, env, 'tile')) {
    return {};
  }
  return {
    onElementClick: (elements) => {
      for (const element of elements) {
        if (!isMetricElementEvent(element)) {
          continue;
        }
        const { rowIndex, columnIndex } = element;
        const tile = scene.tiles[rowIndex * scene.layout.columns + columnIndex];
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
): Handlers => {
  if (!offers(scene, env, 'slice')) {
    return {};
  }
  return {
    /** The innermost slice of the first element: the one the reader hit, as Kibana's partition click takes it. */
    onElementClick: ([first]) => {
      const layers = subjectOf(first);
      const key = Array.isArray(layers)
        ? layers.at(-1)?.groupByRollup
        : undefined;
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
export const heatmapHandlers = (
  scene: HeatmapScene,
  env: SceneRenderEnv
): Handlers => {
  if (!listening(env)) {
    return {};
  }
  const { select, brush } = scene.interactions;
  return {
    ...(select.includes('cell')
      ? {
          /** The first cell Elastic Charts reports: its datum's index is the Scene cell's. */
          onElementClick: ([first]) => {
            const cell = subjectOf(first);
            const selection =
              cell && 'formatted' in cell
                ? scene.cells[cell.datum.originalIndex]?.selection
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
          onBrushEnd: ({ x = [] }) => {
            const [from, to] = [x[0], x.at(-1)];
            if (typeof from === 'number' && typeof to === 'number') {
              raise(env, brushEvent(scene, env.nodeId, [from, to]));
            }
          },
        }
      : {}),
  };
};

/** The handlers this engine passes Elastic Charts for a tag cloud Scene; empty when the chart offers nothing. */
export const tagCloudHandlers = (
  scene: TagCloudScene,
  env: SceneRenderEnv
): Handlers => {
  if (!offers(scene, env, 'tag')) {
    return {};
  }
  return {
    /** The word Elastic Charts reports: the datum this engine passed it, whose `index` `WordModel` omits. */
    onElementClick: ([first]) => {
      const word = subjectOf(first);
      const selection =
        word &&
        'text' in word &&
        'index' in word &&
        typeof word.index === 'number'
          ? scene.words[word.index]?.selection
          : undefined;
      if (selection) {
        raise(env, selectEvent(env.nodeId, selection));
      }
    },
  };
};
