/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one spec builder: a Scene as Elastic Charts spec elements. The browser
// wraps them in `<Chart>`; headless drawing hands them to `collectSpecs`.

import type { ReactNode } from 'react';
import type {
  Scene,
  SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { gaugeSpecs } from './gauge';
import { heatmapSpecs } from './heatmap';
import { metricSpecs } from './metric';
import type { ElasticChartsOptions } from './options';
import { partitionSpecs } from './partition';
import { tagCloudSpecs } from './tag_cloud';
import { xySpecs } from './xy';

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
