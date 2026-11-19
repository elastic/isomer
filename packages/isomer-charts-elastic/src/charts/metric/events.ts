/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMetricElementEvent } from '@elastic/charts';
import {
  type MetricScene,
  type SceneRenderEnv,
  selectEvent,
} from '@elastic/isomer-primitives-charts/scene';

import { type Handlers, offers, raise } from '../../shared/events';

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
