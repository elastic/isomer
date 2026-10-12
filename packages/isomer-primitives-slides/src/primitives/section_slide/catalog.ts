/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SectionSlideNode}. */
export const catalog = {
  type: 'sectionSlide',
  name: 'Section slide',
  description:
    'A section divider. Each slide in `slides` may carry its own href.',
  purpose:
    'Tell the audience a new part of the deck is starting, and what it will cover.',
  useWhen: [
    'Opening a section of a long deck; it is the only node in an inverse frame.',
    'The audience should see the slides ahead as a short list before they start.',
  ],
  avoidWhen: [
    'The slide makes a claim of its own; use slideHeading in a page frame.',
    'The slide opens the whole deck; use titleSlide.',
    'The slide ends the deck; use closingSlide.',
    'The audience should see where this part sits among every section of the talk; use agendaSlide.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
