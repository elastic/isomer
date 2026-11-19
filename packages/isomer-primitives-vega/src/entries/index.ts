/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { VEGA_INPUT_BUDGET, vegaPack } from '../pack';
export {
  type VegaData,
  type VegaNode,
  type VegaRenderContext,
  MAX_BASEMAP_TILES,
  MAX_CHART_SIDE,
  MAX_DATA_ROWS,
  MAX_DRAWN_ITEMS,
  MAX_RESULTS,
  MAX_RESULTS_CHARS,
  MAX_SPEC_CHARS,
  MIN_CHART_SIDE,
  VEGA_RULES,
  brushExample,
  donutExample,
  facetExample,
  heatmapExample,
  histogramExample,
  kibanaPanelExample,
  layeredExample,
  mapExample,
  searchResponseExample,
  signalExample,
  timeSeriesExample,
  vegaCatalog,
  vegaChartSize,
  vegaExample,
  vegaExamples,
  vegaGrammarExample,
  vegaMarkdown,
  vegaPrimitive,
  vegaPrimitiveSchema,
  vegaSchema,
  vegaText,
} from '../primitives/vega';
export {
  type VegaChartInput,
  type VegaLog,
  type VegaSvg,
  createVegaView,
  inertLoader,
  pruneVegaResults,
  renderVegaSvg,
  toVegaSpec,
  VegaRenderError,
} from '../render';
export {
  type SpecIssue,
  type SpecObject,
  type VegaDataset,
  type VegaMode,
  type VegaResult,
  MAX_SPEC_DEPTH,
  TABLE_DATASET,
  hardenVegaSpec,
  isKibanaMap,
  primaryDataset,
  specIssues,
  stripSpec,
  vegaDatasets,
} from '../schema';
export {
  type VegaScheme,
  type VegaTheme,
  VEGA_LAYOUT,
  VEGA_THEMES,
  vegaConfig,
  vegaLiteConfig,
  vegaStylesheet,
} from '../theme';
