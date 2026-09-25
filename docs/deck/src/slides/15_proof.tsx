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
  SlideHeading,
  SlideRenderGrid,
  toComposition,
} from '../shim';

import { lineSlide } from './06_line';

export const proofSlide = toComposition(
  <Slide title="The line, rendered three more ways">
    <SlideFrame {...frame} chapterNumber="03" chapter="How it works">
      <SlideHeading
        title="The line, rendered three more ways"
        lede="Nothing here is a mock. The runtime rendered these when the deck was built."
      />
      <SlideRenderGrid
        composition={lineSlide}
        tiles={[
          { surface: 'svg', caption: 'surfaces.svg.render, then PNG' },
          { surface: 'markdown', caption: 'surfaces.markdown.render' },
          { surface: 'text', caption: 'surfaces.text.render' },
          { surface: 'slack', caption: 'surfaces.slack.render' },
        ]}
      />
    </SlideFrame>
  </Slide>
);
