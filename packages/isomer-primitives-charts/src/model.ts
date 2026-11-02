/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform-neutral `./model` import boundary: schemas, resolved model types and
 * the reading/paint/alignment rules every renderer shares. Later chart families
 * add their own names here as they land; React, engines and the pack stay out.
 */
export {
  type MetricFormat,
  type MetricReading,
  type MetricTile,
  type MetricTrendModel,
} from './model/declarations';
export {
  type AlignedMetricPoint,
  alignMetricTrends,
  metricTileColor,
} from './model/presentation';
export {
  type MetricComparison,
  compareMetric,
  formatMetricValue,
} from './model/readings';
export { metricTrendSchema } from './model/validation';
