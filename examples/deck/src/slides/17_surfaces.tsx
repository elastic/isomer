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

import { titleSlide } from './00_title';

export const surfacesSlide = toComposition(
  <Slide title="One composition renders to six surfaces">
    <SlideFrame {...frame} sectionNumber="03" section="How it works">
      <SlideHeading
        title="One composition renders to six surfaces"
        lede="Each tile is the same composition, rendered by a different surface."
      />
      <SlideRenderGrid
        composition={titleSlide}
        tiles={[
          { surface: 'react', caption: "Inside a host's own page" },
          { surface: 'html', caption: 'Markup plus only the CSS it uses' },
          { surface: 'svg', caption: 'Rasterized for email and reports' },
          { surface: 'slack', caption: 'Block Kit, or Markdown as a fallback' },
          { surface: 'markdown', caption: 'Docs, chat, and agent context' },
          { surface: 'text', caption: 'Terminals and SMS' },
        ]}
      />
    </SlideFrame>
  </Slide>
);
