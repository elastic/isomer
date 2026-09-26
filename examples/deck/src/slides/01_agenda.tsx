/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlideFrameNode,
  SlideSectionNode,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import {
  frame,
  Slide,
  SlideAgenda,
  SlideFrame,
  SlideHeading,
  toComposition,
} from '../shim';

import { sectionProblemSlide } from './02_section_problem';
import { sectionModelSlide } from './07_section_model';
import { sectionHowSlide } from './15_section_how';
import { sectionPackSlide } from './24_section_pack';
import { sectionStartSlide } from './31_section_start';

const sectionOf = ({ body }: Composition) =>
  (body[0] as SlideFrameNode).body[0] as SlideSectionNode;

const sections = [
  sectionProblemSlide,
  sectionModelSlide,
  sectionHowSlide,
  sectionPackSlide,
  sectionStartSlide,
].map((slide) => {
  const { number, title, contents } = sectionOf(slide);
  return {
    number,
    title,
    count: `${contents.length} ${contents.length === 1 ? 'slide' : 'slides'}`,
  };
});

export const agendaSlide = toComposition(
  <Slide title="Where this deck goes">
    <SlideFrame {...frame}>
      <SlideHeading title="Where this deck goes" />
      <SlideAgenda {...{ sections }} />
    </SlideFrame>
  </Slide>
);
