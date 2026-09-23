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

export const startSlide = toComposition(
  <Slide title="Start here">
    <SlideFrame {...frame} chapter="Start here" chapterNumber="17">
      <SlideTitle
        title="Pick a path."
        lede={[
          'The docs are at ',
          {
            type: 'link',
            text: 'elastic.github.io/isomer',
            href: 'https://elastic.github.io/isomer/',
          },
          ', and the source is at ',
          {
            type: 'link',
            text: 'github.com/elastic/isomer',
            href: 'https://github.com/elastic/isomer',
          },
          '.',
        ]}
        size="hero"
      />
      <SlideCardGroup columns={5}>
        <SlideCard title="Render in a host" tone="primary">
          The runtime quick start, then Surfaces.
        </SlideCard>
        <SlideCard title="Write a pack" tone="teal">
          The SDK quick start, then Authoring a primitive.
        </SlideCard>
        <SlideCard title="Wire an agent" tone="pink">
          The authoring context and the parse-and-retry loop.
        </SlideCard>
        <SlideCard title="Draw images" tone="warning">
          The Takumi backend and its fonts.
        </SlideCard>
        <SlideCard title="Measure" tone="success">
          Evals, and how to read the numbers.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
