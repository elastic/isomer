/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideSection, toComposition } from '../shim';

export const sectionPackSlide = toComposition(
  <Slide title="Building a pack">
    <SlideFrame
      {...frame}
      chapterNumber="04"
      chapter="Building a pack"
      tone="inverse">
      <SlideSection
        number="04"
        title="Building a pack"
        contents={[
          'A primitive is one folder',
          "What the pack's primitives draw",
          'The pack kept growing after the redesign',
          'Anatomy of a timeline slide',
          'Every rendered value has one source',
          'Measure a model against your pack',
        ]}
      />
    </SlideFrame>
  </Slide>
);
