/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideDefinitionsNode}. */
export const catalog = {
  type: 'slideDefinitions',
  purpose:
    'Teach the audience a few terms they need before the rest of the talk makes sense.',
  useWhen: [
    'You introduce vocabulary the audience will hear again on later slides.',
    'Each item is a name with a one-sentence meaning, and the name is the thing to remember.',
  ],
  avoidWhen: [
    'The items are short facts rather than terms to learn; use slideList.',
    'Each item has several attributes to compare; use slideTable.',
    'The items split by who owns them; use slideTerritoryGroup.',
    'The items are parallel options with tags; use slideColumns.',
    'The terms connect to each other and the links matter; use slideGraph.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
