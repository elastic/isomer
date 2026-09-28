/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideFanout,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

export const titleSlide = toComposition(
  <Slide title="Isomer">
    <SlideFrame {...frame} brand="Elastic" tone="inverse">
      <SlideTitle
        eyebrow="A portable UI runtime"
        title="Isomer"
        tagline="One composition. Every surface."
        definition={{
          term: 'isomer n.',
          text: 'One formula, many forms; the same composition rendered to every surface.',
        }}
        aside={
          <SlideFanout
            source="Composition"
            targets={[
              { name: 'react', body: 'Elements inside a host page' },
              { name: 'html', body: 'Markup plus only the CSS it uses' },
              { name: 'svg', body: 'An element a rasterizer turns into PNG' },
              { name: 'slack', body: 'Block Kit, or Markdown as a fallback' },
              { name: 'markdown', body: 'Structured prose for docs and chat' },
              { name: 'text', body: 'A plain string for terminals and SMS' },
            ]}
          />
        }
      />
    </SlideFrame>
  </Slide>
);
