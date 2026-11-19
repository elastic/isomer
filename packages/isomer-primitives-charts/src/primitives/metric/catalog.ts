/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { metricSingleValue } from './examples';

/** What an agent reads to choose `metric`: purpose, when to use it, and an example. */
export const metricCatalog: PrimitiveCatalogEntry = {
  type: 'metric',
  name: 'Metric',
  purpose:
    'Show one headline number, or one tile per category, with an optional comparison, progress bar or trend.',
  useWhen: [
    'The answer is a single measured value, such as a count, rate or total.',
    'The same measure is wanted side by side for a handful of categories.',
    'A value needs context: progress toward a maximum, a change from a baseline, or its recent trend.',
  ],
  avoidWhen: [
    'The reader needs to see how values change over time or compare many categories: use `xyChart`.',
    'There are more categories than fit as tiles: use `xyChart` bars.',
    'A Lens legacy metric or an aggregation-based metric visualization is shown: use `legacyMetric`.',
  ],
  example: metricSingleValue,
};
