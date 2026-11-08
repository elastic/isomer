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

import { metricSpecs } from './metric';
import type { ElasticChartsOptions } from './options';
import { xySpecs } from './xy';

/** A metric or xy Scene as Elastic Charts spec elements; `null` for any other kind. */
export const sceneSpecs = (
  scene: Scene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions = {}
): ReactNode => {
  if (scene.kind === 'metric') {
    return metricSpecs(scene, env, options);
  }
  return scene.kind === 'xy' ? xySpecs(scene, env, options) : null;
};
