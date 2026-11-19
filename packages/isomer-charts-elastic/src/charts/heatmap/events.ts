/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  brushEvent,
  type HeatmapScene,
  type SceneRenderEnv,
  selectEvent,
} from '@elastic/isomer-primitives-charts/scene';

import {
  type Handlers,
  listening,
  raise,
  subjectOf,
} from '../../shared/events';

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
