/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioApp } from '@elastic/isomer-studio';

/** Captured Lens panels beside Isomer's drawing of the same saved state and data. */
export const lensComparisonApp: StudioApp = {
  id: 'lens-comparison',
  title: 'Lens comparison',
  description:
    "Compare Isomer's drawing of each captured Lens panel with Kibana's, from the same saved state and data.",
  load: () => import('./app'),
};
