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
  SlideGraph,
  SlideHeading,
  toComposition,
} from '../shim';

export const vocabularySlide = toComposition(
  <Slide title="Six terms describe the whole system">
    <SlideFrame {...frame} sectionNumber="02" section="The model">
      <SlideHeading title="Six terms describe the whole system" />
      <SlideGraph
        caption="A runtime is built from packs of primitives, plus optional frames. A composition goes in; a surface comes out."
        nodes={[
          {
            id: 'primitive',
            term: 'Primitive',
            body: 'One node type: a schema, a catalog entry, and a renderer per surface.',
          },
          {
            id: 'pack',
            term: 'Pack',
            body: 'A vocabulary as a value. Packs compose; a duplicate type is rejected.',
          },
          {
            id: 'runtime',
            term: 'Runtime',
            body: 'Packs and frames assembled into a validator, a parser, and surfaces.',
            emphasis: true,
          },
          {
            id: 'surface',
            term: 'Surface',
            body: 'One output format: render a composition, or renderNode a node.',
          },
          {
            id: 'composition',
            term: 'Composition',
            body: 'The wire document. What the answer is, never how it looks.',
            placement: 'above',
          },
          {
            id: 'frame',
            term: 'Frame',
            body: 'The document an image is drawn inside. No frame, no svg surface.',
            placement: 'below',
          },
        ]}
        edges={[
          ['primitive', 'pack'],
          ['pack', 'runtime'],
          ['runtime', 'surface'],
          ['composition', 'runtime'],
          ['frame', 'runtime'],
        ]}
      />
    </SlideFrame>
  </Slide>
);
