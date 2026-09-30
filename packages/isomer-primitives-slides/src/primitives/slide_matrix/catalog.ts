/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideMatrixNode}. */
export const catalog = {
  type: 'slideMatrix',
  purpose:
    'Let the audience see at a glance which options support which capabilities, and where support is only partial.',
  useWhen: [
    'Several options are compared on the same capabilities, and each answer is yes, partly, or no.',
    'The gaps matter more than the details: the audience should spot the empty cells first.',
    'One option is the recommendation: set `highlight` to its column so it stands out.',
  ],
  avoidWhen: [
    'The cells hold numbers or short phrases rather than yes, partly, or no; use slideTable.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
