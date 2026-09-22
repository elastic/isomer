/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCardGroupNode } from './schema';

/** Canonical {@link SlideCardGroupNode} example. */
export const example: SlideCardGroupNode = {
  type: 'slideCardGroup',
  columns: 3,
  cards: [
    {
      badge: '01',
      title: 'Frame',
      body: 'Owns presentation chrome and fixed 16:9 layout.',
    },
    {
      badge: '02',
      title: 'Content',
      body: 'Cards, lists, code, flows, and territories are reusable nodes.',
    },
    {
      badge: '03',
      title: 'Fallbacks',
      body: 'Every node has a markdown and text rendering.',
    },
  ],
};

/** `feature` style, two columns, badges as hero figures, every card toned. */
export const featureExample: SlideCardGroupNode = {
  type: 'slideCardGroup',
  columns: 2,
  style: 'feature',
  cards: [
    {
      badge: '6',
      label: 'Surfaces',
      title: 'One tree, six targets.',
      body: 'React, HTML, SVG, Slack, Markdown, and plain text.',
      tone: 'teal',
    },
    {
      badge: '0',
      label: 'Renderers per surface',
      title: 'No second svg tree.',
      body: 'The image surface lays out the react tree against the stylesheet.',
      tone: 'success',
    },
    {
      badge: '1',
      label: 'Source per value',
      title: 'The theme owns every number.',
      body: 'A primitive reads its group and types no literal of its own.',
      tone: 'warning',
    },
    {
      badge: '!',
      label: 'Invalid',
      title: 'Rejected before render.',
      body: 'A composition that fails validation reaches no surface.',
      tone: 'danger',
    },
  ],
};

/** Conformance examples for {@link SlideCardGroupNode}. */
export const examples: SlideCardGroupNode[] = [example, featureExample];
