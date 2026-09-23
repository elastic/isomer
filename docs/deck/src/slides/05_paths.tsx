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
  SlideFlow,
  SlideFrame,
  SlideStack,
  SlideTitle,
  toComposition,
} from '../shim';

export const pathsSlide = toComposition(
  <Slide title="Two ways in">
    <SlideFrame {...frame} chapter="Two ways in" chapterNumber="05">
      <SlideTitle
        title="Code builds it, or a model does."
        lede="The runtime treats the two paths differently."
        size="compact"
      />
      <SlideStack>
        <SlideFlow
          label="Product path"
          nodes={['Input', 'defineView', 'build', 'validate', 'render']}
        />
        <SlideFlow
          label="Agent path"
          nodes={['Authoring context', 'Model', 'parse', 'retry', 'render']}
          boundaryAfter={2}
        />
        <SlideCardGroup columns={2}>
          <SlideCard label="Product" title="A registered view" tone="primary">
            A stable id, a Zod input schema, and a builder. The registry
            validates the input and the result. Nothing a model wrote touches
            it.
          </SlideCard>
          <SlideCard label="Agent" title="An authored composition" tone="pink">
            The model reads a JSON Schema and a catalog. The host parses what
            comes back, returns the errors for a retry, and renders only what
            parses.
          </SlideCard>
        </SlideCardGroup>
      </SlideStack>
    </SlideFrame>
  </Slide>
);
