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
  SlideCard,
  SlideCardGroup,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';
import { slideCount } from '../slide_count';
import { surfaces } from '../surfaces';

const { schema, primitives } = runtime.getAuthoringContext();
const contextSize = `${Math.round(
  new TextEncoder().encode(JSON.stringify({ schema, primitives })).length / 1024
)} KB`;

export const dogfoodSlide = toComposition(
  <Slide title="Dogfood">
    <SlideFrame {...frame} chapter="Dogfood" chapterNumber="13">
      <SlideTitle
        title="This deck is a pack. The runtime can't tell."
        lede="Every slide is a Composition that the same runtime validates and renders. These numbers were counted when the deck was built."
        size="compact"
      />
      <SlideCardGroup columns={4} style="feature">
        <SlideCard
          badge={String(slideDeckPrimitives.length)}
          title="Primitives"
          tone="primary">
          Registered in slideDeckPrimitives. Four were added for this deck.
        </SlideCard>
        <SlideCard badge={String(slideCount)} title="Slides" tone="teal">
          One .tsx file each, authored with the JSX shim.
        </SlideCard>
        <SlideCard badge={String(surfaces.length)} title="Views" tone="pink">
          Every slide, as a slide, HTML, PNG, Markdown, text, Slack, and JSON.
        </SlideCard>
        <SlideCard badge={contextSize} title="Authoring context" tone="warning">
          The JSON Schema and catalog a model would write this deck from.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
