/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene } from '@elastic/isomer-primitives-charts/scene';

/** The size of the note an empty chart draws: EUI's `s` text, as Lens's `VisualizationNoResults` sets it. */
export const EMPTY_TEXT_SIZE = 14;

/** Its line height, EUI's for `s` text: a note too wide for the chart wraps on these lines. */
export const EMPTY_LINE_HEIGHT = 20;

/** The note a Scene with nothing to draw shows instead, as the Scene states it. */
export const emptyTextOf = (scene: Scene): string | undefined =>
  scene.kind === 'partition' ||
  scene.kind === 'heatmap' ||
  scene.kind === 'gauge'
    ? scene.empty?.text
    : undefined;
