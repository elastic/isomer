/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideBuild } from '../../builds/types';

import type { SlideSequenceNode } from './schema';

/** The grid holds a lifeline and a label per actor, then one cell per message. */
export const sequenceBuild: SlideBuild<SlideSequenceNode> = {
  count: ({ messages }) => messages.length,
  units: (owner, { actors, messages }) => {
    const cells = [...(owner.firstElementChild?.children ?? [])];
    const first = 2 * actors.length;
    return messages.map((_, index) =>
      cells.slice(first + index, first + index + 1)
    );
  },
};
