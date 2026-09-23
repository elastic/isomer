/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCard,
  SlideCardGroup,
  SlideFlow,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

export const imagesSlide = toComposition(
  <Slide title="Images">
    <SlideFrame {...frame} chapter="Images" chapterNumber="10">
      <SlideTitle
        title="Images are two steps."
        lede="The svg surface stops at an element and a stylesheet. Turning that into pixels is a capability the host adds."
        size="compact"
      />
      <SlideFlow
        label="Runtime, then host"
        nodes={['Composition', 'svg surface', 'Element + CSS', 'Takumi', 'PNG']}
        boundaryAfter={3}
      />
      <SlideCardGroup columns={3}>
        <SlideCard
          label="Runtime"
          title="No native dependencies"
          tone="primary">
          The runtime has one entry and no Node built-ins. It runs in a browser,
          a server, or an edge function.
        </SlideCard>
        <SlideCard label="Host" title="The host brings fonts" tone="teal">
          An unregistered family falls back to the backend's own face, so the
          fonts are part of the render.
        </SlideCard>
        <SlideCard label="Output" title="Deterministic" tone="pink">
          Same composition, pinned Takumi, same fonts: same bytes. This deck's
          PNG view is built that way.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
