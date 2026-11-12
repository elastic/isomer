/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This engine, for the root `scripts/bench_charts.cjs`.

/**
 * Ceilings `--check` holds each scenario's median run to, in MB. Each is about
 * 1.5× the largest #2939's build measured on macOS arm64, Linux arm64 and Linux
 * x64 (emulated) on Node 24; rebased onto #2941, it measures within them.
 * `one`'s small delta has a floor, so a runner's variance passes and a
 * doubling fails. Lower a bound when rendering gets cheaper.
 */
const bounds = {
  engine: { peakRssMb: 450, renderRssMb: 190 },
  one: { peakRssMb: 300, renderRssMb: 40 },
  'budget-xy': { peakRssMb: 1650, renderRssMb: 1400 },
  'budget-grid': { peakRssMb: 950, renderRssMb: 690 },
  'burst-limited': { peakRssMb: 480, renderRssMb: 240 },
};

const createRenderers = () => [
  require('@elastic/isomer-charts-elastic-static').createElasticChartsStaticRenderer(),
];

module.exports = { bounds, createRenderers };
