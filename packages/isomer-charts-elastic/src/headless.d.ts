/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@elastic/charts` declares `./headless` in `exports` alone, which
// `moduleResolution: "Node"` does not read.
declare module '@elastic/charts/headless' {
  import type { ReactElement } from 'react';

  export function renderChart(chart: ReactElement): string;
}
