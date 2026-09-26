/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideAgendaNode}. */
export const catalog = {
  type: 'slideAgenda',
  purpose:
    'Show the audience every part of the talk and which one they are in, so they know how far along it is.',
  useWhen: [
    'Opening a talk with its outline, before the first section starts.',
    'Returning to the outline between sections, with the section about to start marked current.',
  ],
  avoidWhen: [
    'The slide opens one section and lists what that section covers; use slideSection.',
    'The rows are dated events or stages of work; use slideTimeline or slideRoadmap.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
