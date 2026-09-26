/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideRoadmap,
  toComposition,
} from '../shim';

export const roadmapSlide = toComposition(
  <Slide title="What is done, and what comes next">
    <SlideFrame {...frame} sectionNumber="05" section="Getting started">
      <SlideHeading title="What is done, and what comes next" />
      <SlideRoadmap
        columns={[
          {
            title: 'Now',
            status: 'Done',
            current: true,
            items: [
              {
                title: `${slideDeckPrimitives.length} primitives`,
                body: 'One theme, in light and dark',
              },
              {
                title: 'Inline marks',
                body: '`code` and **strong** in headings, lists, and columns',
              },
              {
                title: 'Copy button',
                body: 'On commands, in react and html',
              },
              {
                title: 'Agent tools',
                body: 'Any runtime, served over MCP',
              },
            ],
          },
          {
            title: 'Next',
            status: 'Planned',
            items: [
              {
                title: 'Builds',
                body: 'Reveal a slide in steps, stepped by the viewer',
              },
              {
                title: 'Marks everywhere',
                body: 'The rest of the pack’s text fields',
              },
            ],
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
