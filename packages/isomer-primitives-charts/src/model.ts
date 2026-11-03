/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer-neutral entry: no React, DOM, Node built-ins, SDK or chart engine.

export { examples as metricExamples } from './metric/examples';
export {
  type ResolvedMetric,
  type ResolvedMetricTile,
  resolveMetric,
} from './metric/resolve';
export {
  type MetricNode,
  type MetricTile,
  metricSchema,
} from './metric/schema';
export {
  type TileIcon,
  type TileIconGlyph,
  TILE_ICONS,
  tileIconGlyphs,
} from './metric/tile_icons';
export {
  type ValueFormat,
  formatValue,
  valueFormatSchema,
} from './shared/format';
export {
  type Scheme,
  type ValuePalette,
  MAX_PALETTE_BANDS,
  VALUE_PALETTES,
  chartTokens,
  valuePaletteColors,
} from './theme';
