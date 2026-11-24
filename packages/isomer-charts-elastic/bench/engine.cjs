/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Node renderer as `scripts/bench_charts.cjs --engine` loads an engine,
// with the stylesheet its markup needs on `snapshot`.

const { readFileSync } = require('node:fs');

const {
  ELASTIC_CHARTS_HOST_RULES,
  createElasticChartsNodeRenderer,
} = require('@elastic/isomer-charts-elastic/node');

const stylesheets = {};

const stylesheet = (theme) =>
  (stylesheets[theme] ??= `${readFileSync(
    require.resolve(
      `@elastic/charts/theme_only_${theme === 'dark' ? 'dark' : 'light'}.css`
    ),
    'utf8'
  )}\n${ELASTIC_CHARTS_HOST_RULES}`);

const createRenderers = () => [createElasticChartsNodeRenderer()];

/**
 * Ceilings for `--check`, in MB: about twice what Node 22 measures on arm64
 * macOS, to hold across platforms and still catch a doubling.
 */
const bounds = {
  engine: { peakRssMb: 480 },
  one: { peakRssMb: 320 },
  'budget-xy': { peakRssMb: 950, renderRssMb: 670 },
  'burst-unlimited': { peakRssMb: 560 },
};

module.exports = { bounds, createRenderers, stylesheet };
