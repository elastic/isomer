/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideClosingNode}. */
export const catalog = {
  type: 'slideClosing',
  name: 'Closing',
  purpose:
    'Send the audience away knowing where to go next: a few addresses, and what to read first for each goal.',
  useWhen: [
    'Ending a deck; it is the only node in an inverse frame.',
    'The audience will want links to docs, source, or a contact after the talk.',
  ],
  avoidWhen: [
    'The deck is starting; use slideTitle.',
    'A section is starting; use slideSection.',
    'The slide makes a claim mid-deck; use slideHeading in a page frame.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
