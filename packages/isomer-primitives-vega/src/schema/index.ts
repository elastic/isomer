/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type VegaDataset,
  cellText,
  primaryDataset,
  vegaDatasets,
} from './datasets';
export {
  type VegaResult,
  isResultUrl,
  newReadRecord,
  pruneToReads,
  recordReads,
  replaceMarkers,
  resultIssues,
  resultMarker,
  withoutTooltips,
  withResults,
} from './results';
export {
  type SpecIssue,
  type SpecObject,
  MAX_SPEC_DEPTH,
  hardenBuiltSpec,
  hardenVegaSpec,
  isKibanaMap,
  isSpecObject,
  setOwn,
  specIssues,
  stripSpec,
} from './spec';
export {
  type VegaMode,
  TABLE_DATASET,
  TABLE_RULE,
  bindTable,
  tableBindingIssue,
} from './table';
