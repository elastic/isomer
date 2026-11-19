/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { tagCloudServices } from './examples';

/** What an agent reads to choose `tagCloud`: purpose, when to use it, and an example. */
export const tagCloudCatalog: PrimitiveCatalogEntry = {
  type: 'tagCloud',
  name: 'Tag cloud',
  purpose:
    'Show which terms are most frequent or largest at a glance, as words sized by value.',
  useWhen: [
    'The point is which of many terms stand out, not their exact values.',
    'A Lens tag cloud is shown.',
  ],
  avoidWhen: [
    'Values are compared exactly, or ranked: use `xyChart` bars or `dataTable`.',
    'Shares of a total: use `partitionChart`.',
    'There are only a few terms: use `xyChart` bars.',
  ],
  example: tagCloudServices,
};
