/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one spec builder: a Scene as Elastic Charts spec elements. The browser
// wraps them in `<Chart>`; the Node renderer hands them to `renderChart`.

import type { ReactNode } from 'react';
import type {
  Scene,
  SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { gaugeSpecs } from './charts/gauge';
import { heatmapSpecs } from './charts/heatmap/heatmap';
import { metricSpecs } from './charts/metric/metric';
import { partitionSpecs } from './charts/partition/partition';
import { tagCloudSpecs } from './charts/tag_cloud/tag_cloud';
import { xySpecs } from './charts/xy/xy';
import type { ElasticChartsOptions } from './shared/options';

/** A metric, xy, partition, heatmap, gauge or tag cloud Scene as Elastic Charts spec elements; `null` for any other kind, or an empty Scene. */
export const sceneSpecs = (
  scene: Scene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions = {}
): ReactNode => {
  if (scene.kind === 'metric') {
    return metricSpecs(scene, env, options);
  }
  if (scene.kind === 'partition') {
    return partitionSpecs(scene, env, options);
  }
  if (scene.kind === 'tagCloud') {
    return tagCloudSpecs(scene, env, options);
  }
  if (scene.kind === 'gauge') {
    return gaugeSpecs(scene, env, options);
  }
  if (scene.kind === 'heatmap') {
    return heatmapSpecs(scene, env, options);
  }
  return scene.kind === 'xy' ? xySpecs(scene, env, options) : null;
};
