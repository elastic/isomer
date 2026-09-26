/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frame, Slide, SlideFrame, SlideQuote, toComposition } from '../shim';

export const quoteSlide = toComposition(
  <Slide title="JSX is authoring sugar">
    <SlideFrame {...frame} sectionNumber="01" section="The problem">
      <SlideQuote
        text="JSX is **authoring sugar**, not a second representation."
        source="Authoring a primitive"
        context="Isomer docs, on authoring with JSX"
      />
    </SlideFrame>
  </Slide>
);
