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
  SlideCard,
  SlideCardGroup,
  SlideFlow,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

import { vocabularySlide } from './04_vocabulary';

const kilobytes = (css: string) =>
  `${(new TextEncoder().encode(css).length / 1024).toFixed(1)} KB`;

const { css } = runtime.surfaces.html.render(vocabularySlide, {
  css: 'separate',
});

export const renderSlide = toComposition(
  <Slide title="Inside a render">
    <SlideFrame {...frame} chapter="Inside a render" chapterNumber="07">
      <SlideTitle
        title="Validate. Dispatch. Envelope. Styles."
        size="compact"
      />
      <SlideFlow
        nodes={[
          'Composition',
          'Validate',
          'Dispatch',
          'Envelope',
          'Styles',
          'Surface',
        ]}
      />
      <SlideCardGroup columns={4}>
        <SlideCard badge="1" title="Validate">
          One discriminated union over every primitive, then semantic passes.
          Errors are a path and a message.
        </SlideCard>
        <SlideCard badge="2" title="Dispatch">
          One dispatcher keyed by node type. sanitize runs first. A node hidden
          from a surface degrades; it does not disappear.
        </SlideCard>
        <SlideCard badge="3" title="Envelope">
          Each surface wraps the body: a section, an h1, an uppercase title, a
          header block, a frame.
        </SlideCard>
        <SlideCard badge="4" title="Styles" tone="pink">
          {`Render once to collect the classes in use, then emit only those. Slide 04 carries ${kilobytes(css)} of this pack's ${kilobytes(slideStylesheet())}.`}
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
