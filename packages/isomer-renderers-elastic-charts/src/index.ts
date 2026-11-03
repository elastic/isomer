/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChartsPack } from '@elastic/isomer-primitives-charts';

import { elasticChartsRenderers } from './metric';

export { type MetricChartProps, MetricChart } from './metric';
export { elasticChartsReset } from './reset';

/** The charts pack drawn with Elastic Charts. */
export const elasticChartsPack = createChartsPack(elasticChartsRenderers);
