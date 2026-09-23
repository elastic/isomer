/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCard,
  SlideCardGroup,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

export const evalsSlide = toComposition(
  <Slide title="Measuring">
    <SlideFrame {...frame} chapter="Measuring" chapterNumber="16">
      <SlideTitle
        eyebrow="@elastic/isomer-evals"
        title="Measure a model against your pack."
        lede="runEvals replays a corpus with no credentials and scores what the model wrote."
      />
      <SlideCardGroup columns={4}>
        <SlideCard badge="1" title="Validity" tone="primary">
          Parses and validates, including after one retry with the errors fed
          back.
        </SlideCard>
        <SlideCard badge="2" title="Selection" tone="teal">
          Did it pick the right primitives? Multiset F1 against a golden
          composition.
        </SlideCard>
        <SlideCard badge="3" title="Payload" tone="pink">
          How large the composition is, and any node types the model invented.
        </SlideCard>
        <SlideCard badge="4" title="Answerability" tone="warning">
          Optional. A judge reads the render and asks whether it answers the
          question.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
