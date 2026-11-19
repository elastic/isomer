/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { unsupportedVega } from './examples';

/** What an agent reads to choose `unsupported`: purpose, when to use it, and an example. */
export const unsupportedCatalog: PrimitiveCatalogEntry = {
  type: 'unsupported',
  name: 'Unsupported',
  purpose:
    'Say visibly that something could not be shown, why, and where to see it instead.',
  useWhen: [
    'A requested chart, panel or object cannot be materialized or rendered.',
  ],
  avoidWhen: [
    'The content can be shown, even partly: show it and record what was lost in `losses`.',
  ],
  example: unsupportedVega,
};
