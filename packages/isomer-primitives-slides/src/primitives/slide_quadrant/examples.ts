/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideQuadrantNode } from './schema';

/** Canonical {@link SlideQuadrantNode} example. */
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

/** Four items in one cell and none in another. */
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

/** Four items in every cell, the most it holds. */
export const fullExample: SlideQuadrantNode = {
  type: 'slideQuadrant',
  x: { low: 'Cheap', high: 'Costly' },
  y: { low: 'Low value', high: 'High value' },
  quadrants: [
    {
      label: 'Do now',
      items: ['search fix', 'saved carts', 'receipts', 'dark mode'],
    },
    {
      label: 'Plan for',
      items: ['same-day', 'new app', 'loyalty', 'gift cards'],
    },
    {
      label: 'If time allows',
      items: ['new icons', 'sitemap', 'favicons', 'emoji'],
    },
    { label: 'Skip', items: ['own fleet', 'drones', 'kiosks', 'vending'] },
  ],
};

/** Conformance examples for {@link SlideQuadrantNode}. */
export const examples: SlideQuadrantNode[] = [
  example,
  menuExample,
  fullExample,
];
