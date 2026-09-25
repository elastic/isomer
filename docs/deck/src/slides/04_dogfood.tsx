/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideStats,
  toComposition,
} from '../shim';
import { slideCount } from '../slide_count';
import { surfaces } from '../surfaces';

const { schema, primitives } = runtime.getAuthoringContext();
const contextKb = Math.round(
  new TextEncoder().encode(JSON.stringify({ schema, primitives })).length / 1024
);

export const dogfoodSlide = toComposition(
  <Slide title="This deck is built with Isomer">
    <SlideFrame {...frame} chapterNumber="01" chapter="The problem">
      <SlideHeading
        title="This deck is built with Isomer"
        lede="Every slide is a Composition that the same runtime validates and renders. These counts were taken when the deck was built."
      />
      <SlideStats
        items={[
          {
            value: String(slideDeckPrimitives.length),
            label: 'Primitives',
            body: 'Registered in slideDeckPrimitives, the pack this deck is written in.',
          },
          {
            value: String(slideCount),
            label: 'Slides',
            body: 'One .tsx file each, authored with the JSX shim.',
          },
          {
            value: String(surfaces.length),
            label: 'Views per slide',
            body: 'Slide, HTML, PNG, Markdown, text, Slack, and its JSX.',
          },
          {
            value: String(contextKb),
            unit: 'KB',
            label: 'Authoring context',
            body: 'The JSON Schema and catalog a model would write this deck from.',
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
