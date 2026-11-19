/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { dataTableTopHosts } from './examples';

/** What an agent reads to choose `dataTable`: purpose, when to use it, and an example. */
export const catalog: PrimitiveCatalogEntry = {
  type: 'dataTable',
  name: 'Data table',
  purpose:
    'List rows of values to read and compare exactly, with formats, colored cells, bars, sorting, paging and a summary row.',
  useWhen: [
    'The reader needs exact values rather than a shape.',
    'Several measures are wanted side by side for each of many categories.',
    'A Lens data table or a Discover session is shown.',
  ],
  avoidWhen: [
    'The point is a trend or a comparison of sizes: use `xyChart`.',
    'There is one number to report: use `metric`.',
  ],
  example: dataTableTopHosts,
};
