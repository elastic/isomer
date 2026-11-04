/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene, SceneSize } from '../scene/types';

import { drawMetric, metricSize } from './metric';
import type { SvgElement } from './tree';
import { drawXy, xySize } from './xy';

/** Draws a Scene as an SVG tree. Every color is a literal `fill` or `stroke`. */
export const drawScene = (scene: Scene): SvgElement =>
  scene.kind === 'metric' ? drawMetric(scene) : drawXy(scene);

/** The size {@link drawScene} draws `scene` at. */
export const sceneDrawSize = (scene: Scene): SceneSize =>
  scene.kind === 'metric' ? metricSize(scene) : xySize(scene);
