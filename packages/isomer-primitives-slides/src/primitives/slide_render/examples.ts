/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';

import type { SlideRenderNode } from './types';

/** A whole slide, as the composition a render embeds. */
export const deliverySlide: Composition<BodyNode> = {
  type: 'view',
  title: 'Delivery times',
  body: [
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
  ],
};

/** Canonical {@link SlideRenderNode} example: another slide as the image surface draws it. */
export const example: SlideRenderNode = {
  type: 'slideRender',
  slide: 'delivery-times',
  composition: deliverySlide,
  surface: 'svg',
  caption: 'The delivery slide, from the svg surface',
};

/** A reference the host has not filled in yet: a placeholder. */
export const placeholderExample: SlideRenderNode = {
  type: 'slideRender',
  slide: '04',
  surface: 'svg',
  caption: 'The weekly summary, from the svg surface',
};

/** The same slide's Markdown. */
export const markdownExample: SlideRenderNode = {
  type: 'slideRender',
  composition: deliverySlide,
  surface: 'markdown',
  caption: 'The delivery slide, as Markdown',
};

/** The same slide's Slack blocks, without a caption. */
export const slackExample: SlideRenderNode = {
  type: 'slideRender',
  composition: deliverySlide,
  surface: 'slack',
};

/** Body nodes that are not a `slideFrame` get the frame's spacing. */
export const bareExample: SlideRenderNode = {
  type: 'slideRender',
  composition: {
    type: 'view',
    body: [
      {
        type: 'slideHeading',
        title: 'Refunds settle in two days',
        lede: 'The ledger write now runs before the fraud check.',
      },
    ],
  },
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
