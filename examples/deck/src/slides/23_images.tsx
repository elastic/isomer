/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlidePipeline,
  toComposition,
} from '../shim';

export const imagesSlide = toComposition(
  <Slide title="Images take two steps">
    <SlideFrame {...frame} sectionNumber="03" section="How it works">
      <SlideHeading
        title="Images take two steps"
        lede="The svg surface stops at an element and a stylesheet. Turning that into pixels is a capability the host adds."
      />
      <SlidePipeline
        steps={[
          { title: 'Composition' },
          { title: 'svg surface' },
          { title: 'Element + CSS' },
          { title: 'Takumi' },
          { title: 'PNG' },
        ]}
        spans={[
          {
            from: 0,
            to: 2,
            tone: 'primary',
            label: 'Runtime',
            title: 'No native dependencies',
            body: 'One entry and no Node built-ins. It runs in a browser, a server, or an edge function.',
          },
          {
            from: 3,
            to: 4,
            tone: 'accent',
            label: 'Host',
            title: 'The host brings fonts',
            body: 'Same composition, pinned Takumi, same fonts: same bytes. This deck’s PNG view is built that way.',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
