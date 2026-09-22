/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideBulletListNode } from './schema';

/** Canonical {@link SlideBulletListNode} example. */
export const example: SlideBulletListNode = {
  type: 'slideBulletList',
  items: ['Same spec feeds every renderer.', 'Markdown stays useful.'],
};

/** `check` marker with a label. */
export const checkExample: SlideBulletListNode = {
  type: 'slideBulletList',
  label: 'Shipped',
  marker: 'check',
  items: ['Validation before render.', 'One stylesheet for html and svg.'],
};

/** `x` marker with a label. */
export const xExample: SlideBulletListNode = {
  type: 'slideBulletList',
  label: 'Out of scope',
  marker: 'x',
  items: ['Routing between slides.', 'Data fetching.'],
};

/** Conformance examples for {@link SlideBulletListNode}. */
export const examples: SlideBulletListNode[] = [
  example,
  checkExample,
  xExample,
];
