/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCode,
  SlideFrame,
  SlideHeading,
  toComposition,
} from '../shim';

export const themeSlide = toComposition(
  <Slide title="Every rendered value has one source">
    <SlideFrame {...frame} chapterNumber="04" chapter="Building a pack">
      <SlideHeading
        title="Every rendered value has one source"
        lede="Every length and color lives in one theme group. A style module reads tokens; it never types a value."
      />
      <SlideCode
        panels={[
          {
            file: 'theme/components/table.ts',
            language: 'ts',
            highlight: [3],
            lines: [
              'export const table = {',
              '  border: stroke.panel,',
              '  radius: radius.chip,',
              '  divider: stroke.panel,',
              '  labelGap: space.px20,',
              '  rowHeaderWeight: font.weight.bold,',
              '} as const;',
            ],
          },
          {
            file: 'slide_table/styles.ts',
            language: 'ts',
            highlight: [3],
            lines: [
              'grid: css`',
              '  background: ${color.bgSurface};',
              '  border-radius: ${table.radius};',
              '  display: grid;',
              '  overflow: hidden;',
              '`,',
            ],
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
