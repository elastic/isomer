/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideQuoteNode}. */
export const catalog = {
  type: 'slideQuote',
  name: 'Quote',
  purpose:
    'Let a customer, a colleague, or a document make the point in their own words, with the source named.',
  useWhen: [
    'Someone else’s words carry more weight than a paraphrase would.',
    'A slide should pause on one piece of evidence from a person or a source.',
  ],
  avoidWhen: [
    'The sentence is your own claim; use slideStatement.',
    'Several people speak in turn; use slideTranscript.',
    'The source is a report or dataset behind the slide’s figures; cite it with slideSource.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
