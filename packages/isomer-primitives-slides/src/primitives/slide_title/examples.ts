/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTitleNode } from './schema';

/** Canonical {@link SlideTitleNode} example. */
export const example: SlideTitleNode = {
  type: 'slideTitle',
  eyebrow: 'Proof point',
  title: 'This slide is built from Isomer primitives.',
  lede: 'The same spec renders as HTML, markdown, text, Slack, and SVG.',
};

/** `jumbo` size, a non-default tone, and a lede mixing text and a link. */
export const jumboExample: SlideTitleNode = {
  type: 'slideTitle',
  eyebrow: 'Reference pack',
  size: 'jumbo',
  title: 'Six.',
  tone: 'teal',
  lede: [
    'Surfaces from one composition; see ',
    {
      type: 'link',
      text: 'the runtime docs',
      href: 'https://github.com/elastic/isomer',
      openInNewTab: true,
    },
    '.',
  ],
};

/** `hero` size with the `subtle` tone and no lede. */
export const heroExample: SlideTitleNode = {
  type: 'slideTitle',
  size: 'hero',
  title: 'One composition, every surface.',
  tone: 'subtle',
};

/** Conformance examples for {@link SlideTitleNode}. */
export const examples: SlideTitleNode[] = [example, jumboExample, heroExample];
