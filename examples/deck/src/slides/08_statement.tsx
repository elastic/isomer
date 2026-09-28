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
  SlideStatement,
  toComposition,
} from '../shim';

export const statementSlide = toComposition(
  <Slide title="A Composition says what the answer is, never how it looks">
    <SlideFrame {...frame} sectionNumber="02" section="The model">
      <SlideStatement text="A Composition says **what** the answer is, never **how** it looks." />
    </SlideFrame>
  </Slide>
);
