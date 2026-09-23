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
  SlideTerritory,
  SlideTerritoryGroup,
  SlideTitle,
  toComposition,
} from '../shim';

export const lineSlide = toComposition(
  <Slide title="The line">
    <SlideFrame {...frame} chapter="The line" chapterNumber="03">
      <SlideTitle
        eyebrow="Ownership"
        title="Isomer owns layout. The host owns everything else."
        lede="That line is what lets a host render a composition an agent wrote while trusting it with nothing but layout."
      />
      <SlideTerritoryGroup>
        <SlideTerritory title="Isomer" tone="primary">
          The composition contract, the primitive catalog, validation, and
          rendering.
        </SlideTerritory>
        <SlideTerritory title="Host" tone="pink">
          Data, authorization, routing, and side effects.
        </SlideTerritory>
      </SlideTerritoryGroup>
    </SlideFrame>
  </Slide>
);
