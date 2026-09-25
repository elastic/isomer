/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideClosing, SlideFrame, toComposition } from '../shim';

export const startSlide = toComposition(
  <Slide title="Start here">
    <SlideFrame
      {...frame}
      chapterNumber="05"
      chapter="Getting started"
      tone="inverse">
      <SlideClosing
        title="Start here"
        links={[
          {
            label: 'Docs',
            href: 'https://elastic.github.io/isomer/',
            text: 'elastic.github.io/isomer',
          },
          {
            label: 'Source',
            href: 'https://github.com/elastic/isomer',
            text: 'github.com/elastic/isomer',
          },
        ]}
        paths={[
          {
            title: 'Render in a host',
            body: 'The runtime quick start, then Surfaces and View registry',
          },
          {
            title: 'Write a pack',
            body: 'The SDK quick start, then Authoring a primitive',
          },
          {
            title: 'Wire up an agent',
            body: 'The authoring context and the parse-and-retry loop',
          },
          { title: 'Draw images', body: 'The Takumi backend and its fonts' },
          {
            title: 'Measure a model',
            body: 'Evals, and how to read the numbers',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
