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
  SlideStats,
  toComposition,
} from '../shim';

export const evalsSlide = toComposition(
  <Slide title="Measure a model against your pack">
    <SlideFrame {...frame} chapterNumber="04" chapter="Building a pack">
      <SlideHeading
        title="Measure a model against your pack"
        lede="runEvals replays a corpus with no credentials and scores what the model wrote."
      />
      <SlideStats
        items={[
          {
            label: 'Validity',
            body: 'Parses and validates, including after one retry with the errors fed back.',
          },
          {
            label: 'Selection',
            body: 'Multiset F1 of the chosen primitives against a golden composition.',
          },
          {
            label: 'Payload',
            body: 'How large the composition is, and any node types the model invented.',
          },
          {
            label: 'Answerability',
            body: 'Optional. A judge reads the render and asks whether it answers the question.',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
