/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';

import {
  frame,
  Slide,
  SlideDelta,
  SlideFrame,
  SlideHeading,
  SlideSource,
  toComposition,
} from '../shim';

/** Primitives registered after the slides pack redesign. */
export const addedSinceRedesign: readonly string[] = [
  'slideAgenda',
  'slideAnnotatedRender',
  'slideBars',
  'slideCommand',
  'slideDelta',
  'slideDiff',
  'slideLayers',
  'slideMatrix',
  'slideQuadrant',
  'slideQuote',
  'slideRoadmap',
  'slideSequence',
  'slideSource',
  'slideStatement',
];

const today = slideDeckPrimitives.length;
const atRedesign = today - addedSinceRedesign.length;

export const growthSlide = toComposition(
  <Slide title="The pack kept growing after the redesign">
    <SlideFrame {...frame} sectionNumber="04" section="Building a pack">
      <SlideHeading title="The pack kept growing after the redesign" />
      <SlideDelta
        before={{ label: 'The redesign', value: String(atRedesign) }}
        after={{ label: 'Today', value: String(today) }}
        change={`+${today - atRedesign}`}
        body="None was retired, and every new one follows the same one-folder layout."
      />
      <SlideSource text="`slideDeckPrimitives` today, and the registry at the redesign commit" />
    </SlideFrame>
  </Slide>
);
