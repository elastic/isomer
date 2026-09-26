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
  SlideQuadrant,
  toComposition,
} from '../shim';

export const quadrantSlide = toComposition(
  <Slide title="Six surfaces on two axes">
    <SlideFrame {...frame} chapterNumber="03" chapter="How it works">
      <SlideHeading title="Six surfaces on two axes" />
      <SlideQuadrant
        x={{ low: 'React renderer', high: 'Own renderers' }}
        y={{ low: 'Throws', high: 'Keeps rendering' }}
        quadrants={[
          { label: 'Drawn, keeps rendering', items: ['react', 'html'] },
          { label: 'Written, keeps rendering', items: [] },
          { label: 'Drawn, throws', items: ['svg'] },
          { label: 'Written, throws', items: ['slack', 'markdown', 'text'] },
        ]}
      />
    </SlideFrame>
  </Slide>
);
