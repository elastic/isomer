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
    'One code panel. Every highlighted line number exists in the panel.',
  purpose: 'Show the reader real source, with the lines that matter marked.',
  useWhen: [
    'The point of the slide is a specific snippet: a config, a schema, a call.',
    'A few lines of a real file matter, and line numbers and a highlight can point at them.',
  ],
  avoidWhen: [
    'You want to show where a value is defined and where it is used; use slideCodeTrace.',
    'The code is a back-and-forth between a person, a model, and a program; use slideTranscript.',
    'The snippet needs more than sixteen lines; cut it down, or name the files with slideTree.',
    'The output belongs to a place, like a terminal or a Slack channel; put it in a slideWindowLayout.',
    'The point is what a change did to the code, lines added and removed; use slideDiff.',
    'The snippet is one shell command for the audience to run; use slideCommand.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
