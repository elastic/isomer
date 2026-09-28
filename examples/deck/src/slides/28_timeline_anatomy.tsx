/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideAnnotatedRender,
  SlideFrame,
  SlideHeading,
  SlideRender,
  toComposition,
} from '../shim';

export const timelineAnatomySlide = toComposition(
  <Slide title="Anatomy of a timeline slide">
    <SlideFrame {...frame} sectionNumber="04" section="Building a pack">
      <SlideHeading title="Anatomy of a timeline slide" />
      <SlideAnnotatedRender
        render={
          <SlideRender
            slide="problem"
            surface="svg"
            caption="The timeline slide, from the svg surface"
          />
        }
        pins={[
          {
            x: 60,
            y: 18,
            title: 'Heading',
            body: 'The claim as a sentence, then a lede that supports it.',
          },
          {
            x: 44,
            y: 53,
            title: 'Rail',
            body: 'A 3px rule through every dot.',
          },
          {
            x: 88,
            y: 47,
            title: 'Current item',
            body: 'Label, dot, and channel in primary, with a halo.',
          },
          {
            x: 28,
            y: 94,
            title: 'Footer',
            body: 'Brand, section, and URL, the same on every slide.',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
