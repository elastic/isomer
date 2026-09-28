/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideColumns,
  SlideFrame,
  SlideHeading,
  toComposition,
} from '../shim';

export const posturesSlide = toComposition(
  <Slide title="Each surface has one validation posture">
    <SlideFrame {...frame} sectionNumber="03" section="How it works">
      <SlideHeading
        title="Each surface has one validation posture"
        lede="Every primitive renders to react, text, and markdown, so every composition has a form every surface can show."
      />
      <SlideColumns
        items={[
          {
            title: 'Never validates',
            tags: ['react'],
            body: 'The interactive target, where a partial render beats an exception.',
          },
          {
            title: 'Renders and reports',
            tags: ['html'],
            body: 'Findings go on `validationErrors`, because a partial document is still worth showing.',
          },
          {
            title: 'Throws',
            tags: ['svg', 'markdown', 'text', 'slack'],
            body: 'A string, a message about to be posted, or an image has nowhere to carry findings.',
          },
        ]}
        footnote={{
          code: 'onValidationError',
          text: "flips a validating surface's posture.",
        }}
      />
    </SlideFrame>
  </Slide>
);
