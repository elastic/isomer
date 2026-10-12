/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideAnnotatedRenderNode}. */
export const catalog = {
  type: 'slideAnnotatedRender',
  name: 'Annotated render',
  description:
    'One slideRender with one to six pins. The render needs a `slide` reference or a `body`, and its body never holds another render.',
  purpose:
    'Walk the audience through the parts of a real render, with numbered pins on it and a legend that says what each part does.',
  useWhen: [
    'The slide explains the anatomy of a screen or another slide, part by part.',
    'You want the audience to find specific details in a render, not just see it whole.',
  ],
  avoidWhen: [
    'The render speaks for itself and needs no pointers; use slideRender.',
    'The parts are ideas, not places in a picture; list them with slideDefinitions.',
    'The same slide should appear on several surfaces; use slideRenderGrid.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
