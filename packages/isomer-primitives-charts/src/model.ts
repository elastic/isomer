/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer-neutral entry: no React, DOM, Node built-ins, SDK or chart engine.

export { examples as metricExamples } from './metric/examples';
export {
  type MetricLayout,
  type ResolvedMetric,
  type ResolvedMetricTile,
  type ResolvedSecondary,
  resolveMetric,
} from './metric/resolve';
export {
  type MetricNode,
  type MetricTile,
  metricSchema,
  metricTileSchema,
} from './metric/schema';
export { type ChartAction, actionSchema, toActionEvent } from './shared/action';
export {
  type ColorRef,
  colorSchema,
  resolveBadge,
  resolveFill,
  sparkShade,
  textOn,
} from './shared/color';
export {
  type ValueFormat,
  formatValue,
  valueFormatSchema,
} from './shared/format';
export { type Point, pointSchema } from './shared/series';
export {
  type ChartTokens,
  type Scheme,
  type TextTokens,
  type Tone,
  type ToneTokens,
  TONES,
  chartTokens,
} from './theme';
