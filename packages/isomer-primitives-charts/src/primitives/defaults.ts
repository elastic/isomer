/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createChartPrimitiveConfig,
  type ReactSceneRenderer,
  summarySceneRenderer,
} from '../render';

import { tableSceneRenderer } from './data_table/react';
import { legacyMetricSceneRenderer } from './legacy_metric/react';
import { resolveChart } from './resolve_chart';

/** The pack's own renderers, tried after a host's: the in-pack table and legacy metric, then the summary fallback. */
export const PACK_SCENE_RENDERERS: readonly ReactSceneRenderer[] = [
  tableSceneRenderer,
  legacyMetricSceneRenderer,
  summarySceneRenderer,
];

/** What each chart primitive's default definition draws with: `resolveChart`, then {@link PACK_SCENE_RENDERERS}. */
export const defaultChartPrimitiveConfig = createChartPrimitiveConfig({
  resolveScene: resolveChart,
  sceneRenderers: PACK_SCENE_RENDERERS,
});
