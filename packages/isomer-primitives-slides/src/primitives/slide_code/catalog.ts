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
  name: 'Code',
  description:
    'One or two code panels. Every highlighted line number exists in its panel.',
  purpose:
    'Show the reader real source, with the lines that matter marked, or trace one value from the file that sets it to the file that reads it.',
  useWhen: [
    'The point of the slide is a specific snippet: a config, a schema, a call.',
    'You want to show where a value is defined and where it is used, as two panels joined by an arrow.',
  ],
  avoidWhen: [
    'The code is a back-and-forth between a person, a model, and a program; use slideTranscript.',
    'The snippet needs more than sixteen lines; cut it down, or name the files with slideTree.',
    'The output belongs to a place, like a terminal or a Slack channel; put it in a slideWindow.',
    'The point is what a change did to the code, lines added and removed; use slideDiff.',
    'The snippet is one shell command for the audience to run; use slideCommand.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
