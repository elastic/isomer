/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene } from '@elastic/isomer-primitives-charts/scene';

/** The size of the note an empty chart draws: EUI's `s` text, as Lens's `VisualizationNoResults` sets it. */
export const EMPTY_TEXT_SIZE = 14;

/** The note a Scene with nothing to draw shows instead, as the Scene states it. */
export const emptyTextOf = (scene: Scene): string | undefined =>
  scene.kind === 'partition' ? scene.empty?.text : undefined;
