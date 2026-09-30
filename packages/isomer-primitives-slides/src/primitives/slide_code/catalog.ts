/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCodeNode}. */
export const catalog = {
  type: 'slideCode',
  purpose:
    'Show the reader real source, with the lines that matter marked, or trace one value from the file that sets it to the file that reads it.',
  useWhen: [
    'The point of the slide is a specific snippet: a config, a schema, a call.',
    'You want to show where a value is defined and where it is used, as two panels joined by an arrow.',
  ],
  avoidWhen: [
    'The snippet needs more than sixteen lines; cut it down to the lines that matter.',
    'The output belongs to a place, like a terminal or a Slack channel; put it in a slideWindow.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
