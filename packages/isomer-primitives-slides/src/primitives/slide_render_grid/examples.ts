/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deliverySlide } from '../slide_render/examples';

import type { SlideRenderGridNode } from './types';

/** Canonical {@link SlideRenderGridNode} example: all six surfaces, 3×2. */
export const example: SlideRenderGridNode = {
  type: 'slideRenderGrid',
  body: deliverySlide,
  tiles: [
    { surface: 'react', caption: 'Inside the ops dashboard' },
    { surface: 'html', caption: 'The weekly email' },
    { surface: 'svg', caption: 'A PNG for the board pack' },
    { surface: 'slack', caption: 'The ops channel' },
    { surface: 'markdown', caption: 'The runbook wiki' },
    { surface: 'text', caption: 'Driver SMS' },
  ],
};

/** Four surfaces, 2×2. */
export const fourExample: SlideRenderGridNode = {
  type: 'slideRenderGrid',
  body: deliverySlide,
  tiles: [
    { surface: 'svg', caption: 'A PNG for the board pack' },
    { surface: 'markdown', caption: 'The runbook wiki' },
    { surface: 'text', caption: 'Driver SMS' },
    { surface: 'slack', caption: 'The ops channel' },
  ],
};

/** Three surfaces in one row. */
export const rowExample: SlideRenderGridNode = {
  type: 'slideRenderGrid',
  body: deliverySlide,
  tiles: [
    { surface: 'svg', caption: 'A PNG for the board pack' },
    { surface: 'slack', caption: 'The ops channel' },
    { surface: 'text', caption: 'Driver SMS' },
  ],
};

/** Two surfaces, side by side. */
export const pairExample: SlideRenderGridNode = {
  type: 'slideRenderGrid',
  body: deliverySlide,
  tiles: [
    { surface: 'react', caption: 'Inside the ops dashboard' },
    { surface: 'text', caption: 'Driver SMS' },
  ],
};

/** Conformance examples for {@link SlideRenderGridNode}. */
export const examples: SlideRenderGridNode[] = [
  example,
  fourExample,
  rowExample,
  pairExample,
];
