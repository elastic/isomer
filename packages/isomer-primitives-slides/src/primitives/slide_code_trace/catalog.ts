/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCodeTraceNode}. */
export const catalog = {
  type: 'slideCodeTrace',
  name: 'Code trace',
  description:
    'Two code panels joined by an arrow. Every highlighted line number exists in its panel.',
  purpose:
    'Trace one value from the file that sets it to the file that reads it.',
  useWhen: [
    'You want to show where a value is defined and where it is used, as two panels joined by an arrow.',
    'A config, a schema, or a type in one file is what another file reads, and that link is the point.',
  ],
  avoidWhen: [
    'One snippet makes the point; use slideCode.',
    'The point is what a change did to the code, lines added and removed; use slideDiff.',
    'The panels would sit in a slideSplitLayout column; a trace needs the full slide width.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
