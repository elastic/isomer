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
  purpose:
    'Introduce the deck’s subject by name, with its promise and, optionally, a diagram of what it does.',
  useWhen: [
    'Opening a deck; it is the only node in an inverse frame.',
    'The subject has a short name worth setting very large.',
  ],
  avoidWhen: [
    'The slide makes a claim mid-deck; use slideHeading in a page frame.',
    'A section is starting; use slideSection.',
    'The deck is ending; use slideClosing.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
