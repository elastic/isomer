/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { markSelectEvent, signalBrushEvent } from './events';
export {
  VEGA_INPUT_BUDGET,
  vegaInteractiveEnhancement,
  vegaPack,
} from './pack';
export {
  type VegaRenderContext,
  VEGA_INTERACTIVE,
  vegaChartSize,
  vegaPrimitive,
  vegaPrimitiveSchema,
} from './primitive';
export { VEGA_LAYOUT } from './render/layout';
export { inertLoader } from './render/loader';
export {
  type VegaChartInput,
  type VegaLog,
  type VegaSvg,
  createVegaView,
  pruneVegaResults,
  renderVegaSvg,
  toVegaSpec,
  VegaRenderError,
} from './render/render';
export { vegaStylesheet } from './render/styles';
export {
  type VegaScheme,
  type VegaTheme,
  VEGA_THEMES,
  vegaConfig,
  vegaLiteConfig,
} from './render/theme';
export { vegaCatalog } from './schema/catalog';
export {
  type VegaDataset,
  primaryDataset,
  vegaDatasets,
} from './schema/datasets';
export {
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
  vegaExample,
  vegaExamples,
  vegaGrammarExample,
} from './schema/examples';
export {
  type VegaData,
  type VegaNode,
  MAX_BASEMAP_TILES,
  MAX_CHART_SIDE,
  MAX_DATA_ROWS,
  MAX_DRAWN_ITEMS,
  MAX_RESULTS,
  MAX_RESULTS_CHARS,
  MAX_SPEC_CHARS,
  MIN_CHART_SIDE,
  VEGA_RULES,
  vegaSchema,
} from './schema/node';
export { type VegaResult } from './schema/results';
export {
  type SpecIssue,
  type SpecObject,
  MAX_SPEC_DEPTH,
  hardenVegaSpec,
  isKibanaMap,
  specIssues,
  stripSpec,
} from './schema/spec';
export { type VegaMode, TABLE_DATASET } from './schema/table';
export { vegaMarkdown, vegaText } from './text';
