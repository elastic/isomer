/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type PartitionNode,
  type PartitionScene,
  type SceneRenderEnv,
  selectEvent,
} from '@elastic/isomer-primitives-charts/scene';

import {
  type Handlers,
  listening,
  offers,
  raise,
  subjectOf,
} from '../../shared/events';

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
