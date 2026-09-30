/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCommandNode}. */
export const catalog = {
  type: 'slideCommand',
  purpose:
    'Give the audience one shell command they can type or copy and run themselves.',
  useWhen: [
    'The slide’s point is what to run: an install, a setup step, a way to try something.',
    'A short sequence of steps, each one command, with a label saying what each does.',
  ],
  avoidWhen: [
    'The command spans several lines, or you are showing source rather than something to run; use slideCode.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
