/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listItemUnits, type SlideBuild } from '../../builds/types';

import type { SlidePipelineNode } from './schema';

/** Steps mode: each step's `li`, the last one with the `end` stub and terminal after the track. */
const stepUnits = (owner: Element, { end }: SlidePipelineNode): Element[][] => {
  const units = listItemUnits(owner);
  const row = [...(owner.firstElementChild?.children ?? [])];
  if (end !== undefined && units.length > 0) {
    units[units.length - 1]!.push(...row.slice(-2));
  }
  return units;
};

/** Spans mode: each step's connector and chip, the step a span ends on with its bracket and caption. */
const spanUnits = (
  owner: Element,
  { steps, spans = [] }: SlidePipelineNode
): Element[][] => {
  const cells = [...(owner.firstElementChild?.children ?? [])];
  const chips = 2 * steps.length - 1;
  if (cells.length !== chips + 2 * spans.length) {
    return [];
  }
  return steps.map((_, index) => [
    ...cells.slice(Math.max(2 * index - 1, 0), 2 * index + 1),
    ...spans.flatMap(({ to }, span) =>
      to === index ? cells.slice(chips + 2 * span, chips + 2 * span + 2) : []
    ),
  ]);
};

export const pipelineBuild: SlideBuild<SlidePipelineNode> = {
  count: ({ steps }) => steps.length,
  units: (owner, node) =>
    node.spans?.length ? spanUnits(owner, node) : stepUnits(owner, node),
};
