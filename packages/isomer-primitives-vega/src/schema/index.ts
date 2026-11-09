/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { vegaCatalog } from './catalog';
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
} from './examples';
export {
  type VegaData,
  type VegaNode,
  MAX_BASEMAP_TILES,
  MAX_CHART_SIDE,
  MAX_RESULTS,
  MAX_RESULTS_CHARS,
  MAX_SPEC_CHARS,
  MIN_CHART_SIDE,
  VEGA_RULES,
  vegaSchema,
} from './node';
export { type VegaResult } from './results';
export {
  type SpecIssue,
  type SpecObject,
  MAX_SPEC_DEPTH,
  hardenVegaSpec,
  isKibanaMap,
  specIssues,
  stripSpec,
} from './spec';
export { type VegaMode, TABLE_DATASET } from './table';
