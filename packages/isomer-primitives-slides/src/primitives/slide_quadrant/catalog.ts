/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideQuadrantNode}. */
export const catalog = {
  type: 'slideQuadrant',
  purpose:
    'Sort a handful of things by two qualities at once, so the audience sees which group each one falls in.',
  useWhen: [
    'Two independent yes-or-no qualities split the options into four groups worth naming, such as effort against impact.',
    'You want the audience to find where each option lands, not read exact scores.',
  ],
  avoidWhen: [
    'Each option has several attributes to compare side by side; use slideTable.',
    'The options fall into groups without two axes behind them; use slideColumns.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
