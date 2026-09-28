/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideStylesheet } from '@elastic/isomer-primitives-slides';

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlidePipeline,
  SlideSource,
  SlideStat,
  toComposition,
} from '../shim';

import { problemSlide } from './03_problem';

const kb = (css: string) =>
  (new TextEncoder().encode(css).length / 1024).toFixed(1);

const slideCss = kb(
  runtime.surfaces.html.render(problemSlide, { css: 'separate' }).css
);
const packCss = kb(slideStylesheet());

export const renderSlide = toComposition(
  <Slide title="Every render runs the same four steps">
    <SlideFrame {...frame} sectionNumber="03" section="How it works">
      <SlideHeading title="Every render runs the same four steps" />
      <SlidePipeline
        start="Composition"
        end="Surface"
        steps={[
          {
            title: 'Validate',
            body: 'One union over every primitive, then semantic passes. Errors are a path and a message.',
          },
          {
            title: 'Dispatch',
            body: 'Keyed by node type: sanitize, then the renderer. A hidden node degrades instead of disappearing.',
          },
          {
            title: 'Envelope',
            body: 'Each surface wraps the body: a section, an h1, an uppercase title, a header block, or a frame.',
          },
          {
            title: 'Styles',
            body: 'Render once to collect the classes in use, then emit only that CSS.',
          },
        ]}
      />
      <SlideStat
        value={slideCss}
        unit="KB"
        body={`The timeline slide ships ${slideCss} KB of the pack's ${packCss} KB stylesheet, because the styles step emits only what the slide uses.`}
      />
      <SlideSource text="`surfaces.html.render` of the timeline slide, and `slideStylesheet()`" />
    </SlideFrame>
  </Slide>
);
