/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene, SceneSize } from '../scene/types';

import { drawMetric, metricSize } from './metric';
import { drawTable, tableSize } from './table';
import type { SvgElement } from './tree';
import { drawXy, xySize } from './xy';

/** Draws a Scene as an SVG tree. Every color is a literal `fill` or `stroke`. */
export const drawScene = (scene: Scene): SvgElement => {
  switch (scene.kind) {
    case 'metric':
      return drawMetric(scene);
    case 'xy':
      return drawXy(scene);
    case 'table':
      return drawTable(scene);
  }
};

/** The size {@link drawScene} draws `scene` at. */
export const sceneDrawSize = (scene: Scene): SceneSize => {
  switch (scene.kind) {
    case 'metric':
      return metricSize(scene);
    case 'xy':
      return xySize(scene);
    case 'table':
      return tableSize(scene);
  }
};
