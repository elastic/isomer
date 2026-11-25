/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@elastic/isomer-benchmarks').BenchConfig} */
module.exports = {
  name: 'charts',
  entries: [
    '@elastic/isomer-primitives-charts',
    '@elastic/isomer-primitives-charts/schema',
    '@elastic/isomer-primitives-charts/scene',
    '@elastic/isomer-primitives-charts/resolve',
  ],
  charts: {},
  // About twice what Node 22 measures on arm64 macOS, to hold across platforms and still catch a doubling.
  bounds: {
    charts: {
      'charts:baseline': { peakRssMb: 280 },
      'charts:budget': { peakRssMb: 900, renderRssMb: 800 },
    },
  },
};
