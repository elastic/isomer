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
  SlideLanes,
  toComposition,
} from '../shim';

export const pathsSlide = toComposition(
  <Slide title="A composition comes from code or from a model">
    <SlideFrame {...frame} chapterNumber="02" chapter="The model">
      <SlideHeading
        title="A composition comes from code or from a model"
        lede="The runtime treats the two paths differently."
      />
      <SlideLanes
        lanes={[
          {
            label: 'Product',
            steps: ['Input', 'defineView', 'build', 'validate'],
          },
          {
            label: 'Agent',
            steps: ['Authoring context', 'Model', 'parse', 'retry'],
          },
        ]}
        join="render"
        notes={[
          {
            title: 'A registered view',
            body: 'A stable id, a Zod input schema, and a builder. The registry validates the input and the result. Nothing a model wrote touches it.',
          },
          {
            title: 'An authored composition',
            body: 'The model reads a JSON Schema and a catalog. The host parses what comes back, returns errors for a retry, and renders only what parses.',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
