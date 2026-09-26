/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideFrameNode}. */
export const catalog = {
  type: 'slideFrame',
  purpose:
    'Hold one 16:9 slide: its content top to bottom and a footer naming the deck, the section, and its address.',
  useWhen: [
    'Every slide; each composition in a deck is exactly one slideFrame and nothing else.',
    'A title, section, or closing slide needs the dark background; set `tone` to `inverse`.',
    'Slides belong to numbered sections; set `sectionNumber` and `section` to the section so the footer tracks it.',
  ],
  avoidWhen: [
    'Content inside a slide needs grouping; frames never nest, so use slideSplit or slideStack.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
