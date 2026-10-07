/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BodyNode } from '../../body_node';

import type { SlideRenderNode } from './types';

/** A whole slide, as the body a render embeds. */
export const deliverySlide: readonly BodyNode[] = [
  {
    type: 'slideFrame',
    brand: 'Basket',
    section: 'Operations',
    sectionNumber: '02',
    body: [
      {
        type: 'slideHeading',
        title: 'Orders now arrive in under 30 minutes',
        lede: 'Routing from the nearest store cut the median wait by eleven minutes.',
      },
    ],
  },
];

/** Canonical {@link SlideRenderNode} example: another slide as the `snapshot` surface draws it. */
export const example: SlideRenderNode = {
  type: 'slideRender',
  slide: 'delivery-times',
  body: deliverySlide,
  surface: 'snapshot',
  caption: 'The delivery slide, from the snapshot surface',
};

/** A reference the host has not filled in yet: a placeholder. */
export const placeholderExample: SlideRenderNode = {
  type: 'slideRender',
  slide: 'weekly-summary',
  surface: 'snapshot',
  caption: 'The weekly summary, from the snapshot surface',
};

export const markdownExample: SlideRenderNode = {
  type: 'slideRender',
  body: deliverySlide,
  surface: 'markdown',
  caption: 'The delivery slide, as Markdown',
};

export const slackExample: SlideRenderNode = {
  type: 'slideRender',
  body: deliverySlide,
  surface: 'slack',
};

/** Nodes that are not a `slideFrame` get the frame's spacing. */
export const bareExample: SlideRenderNode = {
  type: 'slideRender',
  body: [
    {
      type: 'slideHeading',
      title: 'Refunds settle in two days',
      lede: 'The ledger write now runs before the fraud check.',
    },
  ],
  surface: 'react',
  caption: 'A heading on its own, from the react surface',
};

/** Conformance examples for {@link SlideRenderNode}. */
export const examples: SlideRenderNode[] = [
  example,
  placeholderExample,
  markdownExample,
  slackExample,
  bareExample,
];
