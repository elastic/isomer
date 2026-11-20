/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { vegaExample } from './examples';

/** What an agent reads about the `vega` primitive. */
export const vegaCatalog: PrimitiveCatalogEntry = {
  type: 'vega',
  name: 'Vega chart',
  purpose:
    'Draw a chart no chart primitive can: any Vega or Vega-Lite spec, with its data inline.',
  useWhen: [
    'The chart needs a mark, transform, projection or layout only a Vega grammar expresses.',
    'An existing Vega or Vega-Lite spec is the source, such as a Kibana Vega panel.',
  ],
  avoidWhen: [
    'A metric, xyChart, partitionChart or dataTable draws it; they render natively on every engine.',
    'The data lives behind a URL; query it first and inline the rows.',
  ],
  example: vegaExample,
};
