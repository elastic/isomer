/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideHeadingNode}. */
export const catalog = {
  type: 'slideHeading',
  purpose:
    'State what a content slide proves, as a one-line claim with an optional supporting sentence.',
  useWhen: [
    'Opening any page-tone content slide; it is always the first node in the frame body.',
    'The audience should get the point of the slide before reading its body.',
  ],
  avoidWhen: [
    'The slide opens the deck; use slideTitle in an inverse frame.',
    'The slide opens a section; use slideSection in an inverse frame.',
    'The slide closes the deck; use slideClosing in an inverse frame.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
