/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideStatNode}. */
export const catalog = {
  type: 'slideStat',
  name: 'Stat',
  group: 'Data',
  description:
    'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
  purpose:
    'Land one number that proves the slide, with the sentence that says what it means.',
  useWhen: [
    'A slide makes its case with a diagram or list, and one measured number backs it up.',
    'You want a closing proof point under the body, at its natural height.',
  ],
  avoidWhen: [
    'There are two to four numbers to compare side by side; use slideStats.',
    'The number is one attribute among many for several items; use slideTable.',
    'The point is how far the number moved from a before to an after; use slideDelta.',
    'There are many comparable values to rank by size; use slideBars.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
