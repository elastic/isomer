/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCard,
  SlideCardGroup,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

export const vocabularySlide = toComposition(
  <Slide title="Vocabulary">
    <SlideFrame {...frame} chapter="Vocabulary" chapterNumber="04">
      <SlideTitle title="Six words." size="compact" />
      <SlideCardGroup columns={3}>
        <SlideCard badge="01" title="Composition">
          The wire document. What the answer is, never how it looks.
        </SlideCard>
        <SlideCard badge="02" title="Primitive">
          One node type: a schema, a catalog entry, and a renderer per surface.
        </SlideCard>
        <SlideCard badge="03" title="Pack">
          A vocabulary as a value. Packs compose; a duplicate type is rejected.
        </SlideCard>
        <SlideCard badge="04" title="Runtime">
          Packs and frames assembled into a validator, a parser, and surfaces.
        </SlideCard>
        <SlideCard badge="05" title="Frame">
          The document an image is drawn inside. No frame, no svg surface.
        </SlideCard>
        <SlideCard badge="06" title="Surface">
          One output format: render a composition, or renderNode a node.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
