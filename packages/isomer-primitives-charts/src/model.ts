/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { metricTiles } from './model/collapse';
/**
 * Platform-neutral metric contract. Declarations, cross-field validation,
 * reading semantics and presentation aggregation are kept in separate modules.
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
  metricText,
  metricTileColor,
  metricTimeLabel,
} from './model/presentation';
export {
  type MetricComparison,
  compareMetric,
  formatMetricValue,
} from './model/readings';
export { metricTrendSchema } from './model/validation';
