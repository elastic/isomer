/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideAgendaNode } from './schema';

/** Canonical {@link SlideAgendaNode} example. */
export const example: SlideAgendaNode = {
  type: 'slideAgenda',
  sections: [
    { number: '01', title: 'Why returns cost us', count: '3 slides' },
    { number: '02', title: 'What customers told us', count: '4 slides' },
    {
      number: '03',
      title: 'The new returns flow',
      count: '5 slides',
      current: true,
    },
    { number: '04', title: 'Rolling it out', count: '3 slides' },
    { number: '05', title: 'Questions', count: '2 slides' },
  ],
};

/** An opening outline with no counts and none current. */
export const outlineExample: SlideAgendaNode = {
  type: 'slideAgenda',
  sections: [
    { number: '1', title: 'Where the budget went' },
    { number: '2', title: 'What we cut' },
    { number: '3', title: 'What we keep' },
  ],
};

/** Eight sections, the most an agenda holds, late in the talk. */
export const longExample: SlideAgendaNode = {
  type: 'slideAgenda',
  sections: [
    { number: '01', title: 'The incident', count: '2 slides' },
    { number: '02', title: 'Timeline', count: '3 slides' },
    { number: '03', title: 'Root cause', count: '4 slides' },
    { number: '04', title: 'Why tests missed it', count: '2 slides' },
    { number: '05', title: 'What we changed', count: '3 slides' },
    {
      number: '06',
      title: 'What we still owe',
      count: '2 slides',
      current: true,
    },
    { number: '07', title: 'Lessons', count: '2 slides' },
    { number: '08', title: 'Questions', count: '1 slide' },
  ],
};

/** Conformance examples for {@link SlideAgendaNode}. */
export const examples: SlideAgendaNode[] = [
  example,
  outlineExample,
  longExample,
];
