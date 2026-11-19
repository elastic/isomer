/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { legacyMetricSingleValue } from './examples';

/** What an agent reads to choose `legacyMetric`: purpose, when to use it, and an example. */
export const legacyMetricCatalog: PrimitiveCatalogEntry = {
  type: 'legacyMetric',
  name: 'Legacy metric',
  purpose:
    'Show one or more large values with a label above or below each, optionally colored by value range, as Lens’s legacy metric draws them.',
  useWhen: [
    'A Lens legacy metric or an aggregation-based metric visualization is shown.',
    'A few plain values are wanted large, each with its label, and no tile frame.',
  ],
  avoidWhen: [
    'A value needs a comparison, progress bar, trend or icon: use `metric`.',
    'Values are compared across many categories: use `xyChart` bars or `dataTable`.',
  ],
  example: legacyMetricSingleValue,
};
