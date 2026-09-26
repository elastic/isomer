/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideSection, toComposition } from '../shim';

export const sectionStartSlide = toComposition(
  <Slide title="Getting started">
    <SlideFrame
      {...frame}
      sectionNumber="05"
      section="Getting started"
      tone="inverse">
      <SlideSection
        number="05"
        title="Getting started"
        contents={[
          'Four packages publish; two stay in the repo',
          'Preview a primitive in three commands',
          'What is done, and what comes next',
          'Start here',
        ]}
      />
    </SlideFrame>
  </Slide>
);
