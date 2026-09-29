/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A deck is a `Composition[]`, a sequence Isomer does not model: sequencing is routing, and routing belongs to the host.

import type { Composition } from '@elastic/isomer-sdk';

import type { SlideFrameNode } from '../primitives/slide_frame';

const frame = (
  node: Omit<SlideFrameNode, 'type' | 'brand' | 'url'>
): SlideFrameNode => ({
  type: 'slideFrame',
  brand: 'Isomer',
  url: 'https://elastic.github.io/isomer',
  ...node,
});

export const titleSlide: Composition = {
  type: 'view',
  title: 'Isomer',
  body: [
    frame({
      tone: 'inverse',
      body: [
        {
          type: 'slideTitle',
          eyebrow: 'Reference pack',
          title: 'Isomer',
          tagline: 'One composition, **every surface**.',
          aside: {
            type: 'slideBulletList',
            marker: 'check',
            items: [
              'React and HTML',
              'Markdown and plain text',
              'Slack Block Kit',
              'SVG and PNG',
            ],
          },
        },
      ],
    }),
  ],
};

export const splitSlide: Composition = {
  type: 'view',
  title: 'One tree, every surface',
  body: [
    frame({
      section: 'Primitives',
      sectionNumber: '01',
      body: [
        {
          type: 'slideHeading',
          title: 'A slide is **one composition**',
          lede: 'The same tree renders here, in Markdown, and in Slack.',
        },
        {
          type: 'slideSplit',
          ratio: 'wideLeft',
          divider: 'arrow',
          panes: [
            {
              items: [
                {
                  type: 'slideCode',
                  panels: [
                    {
                      file: 'slide.ts',
                      language: 'ts',
                      lines: [
                        'runtime.surfaces.markdown.render(slide);',
                        'runtime.surfaces.slack.render(slide);',
                        'runtime.surfaces.svg.render(slide);',
                      ],
                    },
                  ],
                },
              ],
            },
            {
              label: 'Surfaces',
              tone: 'primary',
              items: [
                {
                  type: 'slideBulletList',
                  items: ['Markdown', 'Slack blocks', 'An image'],
                },
              ],
            },
          ],
        },
      ],
    }),
  ],
};

export const deck: Composition[] = [titleSlide, splitSlide];
