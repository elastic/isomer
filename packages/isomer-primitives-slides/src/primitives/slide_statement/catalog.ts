/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideStatementNode}. */
export const catalog = {
  type: 'slideStatement',
  name: 'Statement',
  group: 'Slide structure',
  purpose:
    'Land one claim the audience should remember, set large on a slide of its own.',
  useWhen: [
    'The slide’s whole point is a single sentence, and anything more would dilute it.',
    'A section needs a pause between denser slides to state its thesis.',
  ],
  avoidWhen: [
    'The claim needs supporting copy or a diagram; open with slideHeading and add a body primitive.',
    'The sentence is someone else’s words; use slideQuote.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
