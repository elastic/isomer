/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  slideDeckPrimitives,
  slidePrimitiveGroups,
} from '@elastic/isomer-primitives-slides';

import {
  frame,
  Slide,
  SlideBars,
  SlideFrame,
  SlideHeading,
  SlideSource,
  toComposition,
} from '../shim';

const largest = Math.max(
  ...slidePrimitiveGroups.map(({ types }) => types.length)
);

const items = slidePrimitiveGroups.map(({ title, types }) => ({
  label: title,
  value: types.length,
  ...(types.length === largest && { highlight: true }),
}));

export const barsSlide = toComposition(
  <Slide title="What the pack's primitives draw">
    <SlideFrame {...frame} sectionNumber="04" section="Building a pack">
      <SlideHeading title="What the pack's primitives draw" />
      <SlideBars {...{ items }} />
      <SlideSource
        text={`All ${slideDeckPrimitives.length} primitives in \`slideDeckPrimitives\`, one folder each under \`src/primitives/\``}
      />
    </SlideFrame>
  </Slide>
);
