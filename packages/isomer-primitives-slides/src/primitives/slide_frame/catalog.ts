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
    'Render a fixed 16:9 presentation slide from nested slide primitives.',
  useWhen: [
    'A registered view needs presentation-grade layout.',
    'The same slide should degrade to markdown or plain text.',
  ],
  avoidWhen: [
    'The content is a normal app or report view that does not require slide layout.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
