/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideWindowNode}. */
export const catalog = {
  type: 'slideWindow',
  purpose:
    'Frame nested slide content in application chrome: a browser, terminal, Slack channel, or chat.',
  useWhen: [
    'A slide shows where an output appears, such as a terminal printing text or a chat replaying a conversation.',
  ],
  avoidWhen: [
    'The content is not tied to a place it appears.',
    'The window would hold another window.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
