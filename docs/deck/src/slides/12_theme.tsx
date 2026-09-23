/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import modulesSource from '../../../../packages/isomer-primitives-slides/src/theme/modules.ts?raw';
import themeSource from '../../../../packages/isomer-primitives-slides/src/theme/theme.ts?raw';
import { excerpt, linesContaining } from '../excerpt';
import {
  frame,
  Slide,
  SlideCode,
  SlideFrame,
  SlideSplit,
  SlideTitle,
  toComposition,
} from '../shim';

const tokens = excerpt(themeSource, 'table: {', 12);
const styles = excerpt(modulesSource, 'export const tableModule', 14);

export const themeSlide = toComposition(
  <Slide title="Theme">
    <SlideFrame {...frame} chapter="Theme" chapterNumber="12">
      <SlideTitle
        title="One source per rendered value."
        lede="Every length, color, and glyph lives in SLIDE_THEME. A style module reads tokens; it never types a value."
        size="compact"
      />
      <SlideSplit
        left={
          <SlideCode
            label="theme.ts"
            language="ts"
            highlight={linesContaining(tokens, 'cell')}>
            {tokens}
          </SlideCode>
        }
        right={
          <SlideCode
            label="modules.ts"
            language="ts"
            highlight={linesContaining(styles, 'cell')}>
            {styles}
          </SlideCode>
        }
      />
    </SlideFrame>
  </Slide>
);
