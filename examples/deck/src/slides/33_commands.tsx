/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCommand,
  SlideFrame,
  SlideHeading,
  toComposition,
} from '../shim';

export const commandsSlide = toComposition(
  <Slide title="Preview a primitive in three commands">
    <SlideFrame {...frame} sectionNumber="05" section="Getting started">
      <SlideHeading
        title="Preview a primitive in three commands"
        lede="The last one renders every example of a primitive to PNG, light and dark."
      />
      <SlideCommand
        label="Clone the repository"
        command="git clone https://github.com/elastic/isomer"
      />
      <SlideCommand label="Install its dependencies" command="pnpm install" />
      <SlideCommand
        label="Preview one primitive"
        command="SLIDE_PREVIEW=slideBars pnpm vitest run preview.test.ts"
        highlightPrefix="SLIDE_PREVIEW=slideBars"
      />
    </SlideFrame>
  </Slide>
);
