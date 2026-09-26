/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideQuadrantNode } from './schema';

/** Canonical {@link SlideQuadrantNode} example: effort against impact. */
export const example: SlideQuadrantNode = {
  type: 'slideQuadrant',
  x: { low: 'Easy', high: 'Hard' },
  y: { low: 'Minor', high: 'Major' },
  quadrants: [
    { label: 'Quick wins', items: ['dark mode', 'saved carts'] },
    { label: 'Big bets', items: ['same-day'] },
    { label: 'Fill-ins', items: ['new icons', 'sitemap'] },
    { label: 'Money pits', items: ['own fleet'] },
  ],
};

/** Four items in one cell and none in another, the first highlighted. */
export const menuExample: SlideQuadrantNode = {
  type: 'slideQuadrant',
  highlight: 0,
  x: { low: 'Thin margin', high: 'Rich margin' },
  y: { low: 'Slow', high: 'Popular' },
  quadrants: [
    { label: 'Plowhorses', items: ['drip', 'bagel', 'muffin', 'tea'] },
    { label: 'Stars', items: ['latte', 'cold brew'] },
    { label: 'Dogs', items: [] },
    { label: 'Puzzles', items: ['matcha', 'affogato', 'cortado'] },
  ],
};

/** Conformance examples for {@link SlideQuadrantNode}. */
export const examples: SlideQuadrantNode[] = [example, menuExample];
