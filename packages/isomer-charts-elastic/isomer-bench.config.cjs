/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@elastic/isomer-benchmarks').BenchConfig} */
module.exports = {
  name: 'charts-elastic',
  entries: [
    '@elastic/isomer-charts-elastic',
    '@elastic/isomer-charts-elastic/engine',
    '@elastic/isomer-charts-elastic/node',
  ],
  charts: { engine: './bench/engine.cjs' },
  // About twice what Node 22 measures on arm64 macOS, to hold across platforms and still catch a doubling.
  bounds: {
    charts: {
      'charts-elastic:engine': { peakRssMb: 480 },
      'charts-elastic:one': { peakRssMb: 320 },
      'charts-elastic:budget-xy': { peakRssMb: 950, renderRssMb: 670 },
      'charts-elastic:burst-unlimited': { peakRssMb: 560 },
    },
  },
};
