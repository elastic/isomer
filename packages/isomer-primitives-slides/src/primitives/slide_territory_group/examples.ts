/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTerritoryGroupNode } from './schema';

/** Canonical {@link SlideTerritoryGroupNode} example. */
export const example: SlideTerritoryGroupNode = {
  type: 'slideTerritoryGroup',
  items: [
    {
      title: 'Host territory',
      body: 'Query, auth, action handlers, telemetry.',
      tone: 'pink',
    },
    {
      title: 'Pack territory',
      body: 'Schema, primitives, renderers, validation.',
      tone: 'primary',
    },
  ],
};

/** The remaining tones, plus an item that takes the default. */
export const tonesExample: SlideTerritoryGroupNode = {
  type: 'slideTerritoryGroup',
  items: [
    {
      title: 'Stable',
      body: 'Composition contract and wire names.',
      tone: 'teal',
    },
    {
      title: 'Ready',
      body: 'Every surface renders every example.',
      tone: 'success',
    },
    {
      title: 'Watch',
      body: 'Snapshots change with a font bump.',
      tone: 'warning',
    },
    { title: 'Blocked', body: 'A frame that nests a frame.', tone: 'danger' },
    {
      title: 'Deferred',
      body: 'Sequencing belongs to the host.',
      tone: 'subtle',
    },
    { title: 'Default', body: 'No tone falls back to primary.' },
  ],
};

/** Conformance examples for {@link SlideTerritoryGroupNode}. */
export const examples: SlideTerritoryGroupNode[] = [example, tonesExample];
