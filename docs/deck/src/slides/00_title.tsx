/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideTitle, toComposition } from '../shim';

export const titleSlide = toComposition(
  <Slide title="Isomer">
    <SlideFrame {...frame} chapter="Isomer" chapterNumber="00" layout="title">
      <SlideTitle
        eyebrow="A portable UI runtime"
        title="Isomer"
        lede="One composition. Every surface."
        size="jumbo"
      />
    </SlideFrame>
  </Slide>
);
