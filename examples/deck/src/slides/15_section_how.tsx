/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideSection, toComposition } from '../shim';

export const sectionHowSlide = toComposition(
  <Slide title="How it works">
    <SlideFrame
      {...frame}
      sectionNumber="03"
      section="How it works"
      tone="inverse">
      <SlideSection
        number="03"
        title="How it works"
        contents={[
          'Every render runs the same four steps',
          'One composition renders to six surfaces',
          'The same answer in Slack and in text',
          'Slack gets Markdown when a primitive has no blocks',
          'Each surface has one validation posture',
          'Six surfaces on two axes',
          'The line, rendered three more ways',
          'Images take two steps',
        ]}
      />
    </SlideFrame>
  </Slide>
);
