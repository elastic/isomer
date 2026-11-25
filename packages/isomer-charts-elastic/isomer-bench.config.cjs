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
  nodeOnly: ['@elastic/isomer-charts-elastic/node'],
};
