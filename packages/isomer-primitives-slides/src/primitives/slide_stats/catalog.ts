/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideStatsNode}. */
export const catalog = {
  type: 'slideStats',
  purpose:
    'Let the audience compare two to four numbers at a glance, each with a label and one line of context.',
  useWhen: [
    'The slide is the numbers: counts, rates, or durations the audience should remember.',
    'Several measures of the same thing belong side by side.',
    'A number is not measured yet but its place on the slide is decided; leave `value` out.',
  ],
  avoidWhen: [
    'There is one headline number supporting other content; use slideStat.',
    'Each item has several attributes, not one number; use slideTable.',
    'The columns are options described in words, not numbers; use slideColumns.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
