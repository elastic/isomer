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
  SlideSplit,
  toComposition,
} from '../shim';

export const lineSlide = toComposition(
  <Slide title="Isomer owns layout. The host owns everything else.">
    <SlideFrame {...frame} chapterNumber="02" chapter="The model">
      <SlideHeading title="Isomer owns layout. The host owns everything else." />
      <SlideSplit
        divider="rule"
        left={{
          label: 'Isomer',
          tone: 'primary',
          items: [
            'The composition contract',
            'The primitive catalog',
            'Validation',
            'Rendering',
          ],
        }}
        right={{
          label: 'Host',
          tone: 'pink',
          items: ['Data', 'Authorization', 'Routing', 'Side effects'],
        }}
        footnote="Because of this line, a host can render a composition an agent wrote while trusting it with nothing but layout."
      />
    </SlideFrame>
  </Slide>
);
