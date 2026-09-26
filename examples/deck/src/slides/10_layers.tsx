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
  SlideLayers,
  toComposition,
} from '../shim';

export const layersSlide = toComposition(
  <Slide title="Five layers, four owners">
    <SlideFrame {...frame} sectionNumber="02" section="The model">
      <SlideHeading title="Five layers, four owners" />
      <SlideLayers
        layers={[
          {
            name: 'Host app',
            body: 'The page, bot, or agent that shows the answer',
            owner: 'Host',
            tone: 'accent',
          },
          {
            name: 'Surface',
            chips: ['react', 'html', 'svg', 'slack', 'markdown', 'text'],
            owner: 'Isomer',
            tone: 'primary',
          },
          {
            name: 'Runtime',
            body: 'Validates a composition and dispatches each node',
            owner: 'Isomer',
            tone: 'primary',
          },
          {
            name: 'Pack',
            body: 'Primitives, their schemas, and a theme',
            owner: 'Pack author',
          },
          {
            name: 'Composition',
            body: 'Typed JSON that code or a model writes',
            owner: 'Author',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
