/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideSectionNode}. */
export const catalog = {
  type: 'slideSection',
  name: 'Section',
  group: 'Slide structure',
  description:
    'A section divider. When hrefs is given it has one entry per contents entry.',
  purpose:
    'Tell the audience a new part of the deck is starting, and what it will cover.',
  useWhen: [
    'Opening a section of a long deck; it is the only node in an inverse frame.',
    'The audience should see the slides ahead as a short list before they start.',
  ],
  avoidWhen: [
    'The slide makes a claim of its own; use slideHeading in a page frame.',
    'The slide opens the whole deck; use slideTitle.',
    'The slide ends the deck; use slideClosing.',
    'The audience should see where this part sits among every section of the talk; use slideAgenda.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
