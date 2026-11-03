/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioApp } from '@elastic/isomer-studio';

/** The Lens-to-chart app, for the charts Studio and the repository's. */
export const lensChartApp: StudioApp = {
  id: 'lens-chart',
  title: 'Lens to chart',
  description:
    'Paste a Lens saved object, bind it to synthetic data, and draw the chart Isomer gives it; nothing is fetched or executed.',
  load: () => import('./app'),
};
