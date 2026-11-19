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

import type {
  BrushEndListener,
  ElementClickListener,
  ProjectionClickListener,
} from '@elastic/charts';
import type {
  ChartEvent,
  SceneRenderEnv,
  SelectTarget,
  XyScene,
} from '@elastic/isomer-primitives-charts/scene';

export type ListeningEnv = SceneRenderEnv & {
  nodeId: string;
  onEvent: (event: ChartEvent) => void;
};

/** Whether the host can receive events from this Scene. */
export const listening = (env: SceneRenderEnv): env is ListeningEnv =>
  env.nodeId !== undefined && env.onEvent !== undefined;

/** Whether the host can receive the Scene's selections of `target`. */
export const offers = (
  { interactions: { select } }: { interactions: XyScene['interactions'] },
  env: SceneRenderEnv,
  target: SelectTarget
): env is ListeningEnv => listening(env) && select.includes(target);

export const raise = (
  env: ListeningEnv,
  event: ChartEvent | undefined
): void => {
  if (event !== undefined) {
    env.onEvent(event);
  }
};

/** The first member of a tuple element: what was hit. The metric element is no tuple. */
export const subjectOf = (
  element: Parameters<ElementClickListener>[0][number] | undefined
) => (Array.isArray(element) ? element[0] : undefined);

export interface Handlers {
  onElementClick?: ElementClickListener;
  onProjectionClick?: ProjectionClickListener;
  onBrushEnd?: BrushEndListener;
}
