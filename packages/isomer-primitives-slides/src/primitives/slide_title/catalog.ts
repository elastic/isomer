/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTitleNode}. */
export const catalog = {
  type: 'slideTitle',
  purpose: 'Render a presentation eyebrow, headline, and optional lede.',
  useWhen: ['A slide needs its primary narrative statement.'],
  avoidWhen: ['The content is body copy inside another component.'],
  example,
} satisfies PrimitiveCatalogEntry;
