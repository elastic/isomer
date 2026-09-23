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
  SlideTable,
  SlideTitle,
  toComposition,
} from '../shim';

export const surfacesSlide = toComposition(
  <Slide title="Surfaces">
    <SlideFrame {...frame} chapter="Surfaces" chapterNumber="08">
      <SlideTitle
        title="Six surfaces. Every one degrades."
        lede="react, text, and markdown renderers are mandatory, so every composition has a form every surface can show. onValidationError flips any surface's posture."
        size="compact"
      />
      <SlideTable
        columns={['Surface', 'Returns', 'On invalid input', 'Renders through']}
        rowHeaders
        rows={[
          ['react', 'React elements', 'Never validates', 'Its own renderer'],
          ['html', 'Markup and CSS', 'Renders, reports findings', 'react'],
          ['svg', 'An element and CSS', 'Throws', 'react, inside a frame'],
          ['markdown', 'A GFM string', 'Throws', 'Its own renderer'],
          ['text', 'A plain string', 'Throws', 'Its own renderer'],
          ['slack', 'Block Kit blocks', 'Throws', 'Its own, or markdown'],
        ]}
      />
    </SlideFrame>
  </Slide>
);
