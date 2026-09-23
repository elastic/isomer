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

export const shipsSlide = toComposition(
  <Slide title="What ships">
    <SlideFrame {...frame} chapter="What ships" chapterNumber="16">
      <SlideTitle
        title="Five packages, one version."
        lede="The SDK and the runtime need react and zod. The runtime also needs react-dom."
        size="compact"
      />
      <SlideTable
        columns={['Package', 'Role', 'You install it to']}
        rowHeaders
        rows={[
          ['@elastic/isomer-sdk', 'Contracts', 'Write primitives and packs'],
          ['@elastic/isomer-runtime', 'Assembly', 'Validate and render'],
          [
            '@elastic/isomer-primitives-slides',
            'Reference pack',
            'Copy it, or render decks',
          ],
          [
            '@elastic/isomer-image-takumi',
            'Rasterizer',
            'Turn the svg surface into PNG',
          ],
          [
            '@elastic/isomer-evals',
            'Harness',
            'Measure a model against a pack',
          ],
        ]}
      />
    </SlideFrame>
  </Slide>
);
