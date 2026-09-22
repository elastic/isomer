/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCodeNode}. */
export const catalog = {
  type: 'slideCode',
  purpose: 'Render a labeled code block.',
  useWhen: ['A slide needs to show a code sample, schema, or command.'],
  avoidWhen: ['The code would require more than 10 lines at readable size.'],
  example,
} satisfies PrimitiveCatalogEntry;
