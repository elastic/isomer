/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listItemUnits, type SlideBuild } from '../../builds/types';

import type { SlidePipelineNode } from './schema';

/** Steps mode lists each step as an `li`; spans mode lays out a connector then a chip per step. */
export const pipelineBuild: SlideBuild<SlidePipelineNode> = {
  count: ({ steps }) => steps.length,
  units: (owner, { steps, spans }) => {
    if (!spans?.length) {
      return listItemUnits(owner);
    }
    const cells = [...(owner.firstElementChild?.children ?? [])];
    return steps.map((_, index) =>
      cells.slice(Math.max(2 * index - 1, 0), 2 * index + 1)
    );
  },
};
