/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideSection, toComposition } from '../shim';

export const sectionModelSlide = toComposition(
  <Slide title="The model">
    <SlideFrame
      {...frame}
      sectionNumber="02"
      section="The model"
      tone="inverse">
      <SlideSection
        number="02"
        title="The model"
        contents={[
          'A Composition says what the answer is, never how it looks',
          'Isomer owns layout. The host owns everything else.',
          'Five layers, four owners',
          'Six terms describe the whole system',
          'A composition comes from code or from a model',
          'One agent turn, with a retry',
          'The agent path retries until it parses',
        ]}
      />
    </SlideFrame>
  </Slide>
);
