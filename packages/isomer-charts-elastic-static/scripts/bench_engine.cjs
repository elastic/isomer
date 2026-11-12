/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This engine, for the root `scripts/bench_charts.cjs`.

/**
 * Ceilings `--check` holds each scenario's median run to, in MB: about 1.5×
 * what macOS arm64 measured on Node 22, so a runner's variance passes and a
 * doubling fails. Linux runs higher; set them from CI's numbers once it has
 * run, and lower a bound when rendering gets cheaper.
 */
const bounds = {
  engine: { peakRssMb: 440, renderRssMb: 200 },
  one: { peakRssMb: 280, renderRssMb: 40 },
  'budget-xy': { peakRssMb: 1890, renderRssMb: 1640 },
  'budget-grid': { peakRssMb: 1120, renderRssMb: 870 },
  'burst-limited': { peakRssMb: 480, renderRssMb: 240 },
};

const createRenderers = () => [
  require('@elastic/isomer-charts-elastic-static').createElasticChartsStaticRenderer(),
];

module.exports = { bounds, createRenderers };
