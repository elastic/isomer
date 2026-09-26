/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideSection, toComposition } from '../shim';

export const sectionProblemSlide = toComposition(
  <Slide title="The problem">
    <SlideFrame
      {...frame}
      chapterNumber="01"
      chapter="The problem"
      tone="inverse">
      <SlideSection
        number="01"
        title="The problem"
        contents={[
          'Every channel has asked for the same missing layer',
          'One typed document holds the shared part',
          'This deck is built with Isomer',
          'JSX is authoring sugar',
        ]}
      />
    </SlideFrame>
  </Slide>
);
