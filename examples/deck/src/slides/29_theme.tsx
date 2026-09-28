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
  SlideDefinitions,
  SlideFrame,
  SlideHeading,
  SlideSplit,
  toComposition,
} from '../shim';

export const themeSlide = toComposition(
  <Slide title="Every rendered value has one source">
    <SlideFrame {...frame} sectionNumber="04" section="Building a pack">
      <SlideHeading
        title="Every rendered value has one source"
        lede="Even the words a primitive draws on its own, like `Source ·`, are theme values."
      />
      <SlideSplit
        ratio="aside"
        divider="hairline"
        left={{
          items: [
            <SlideCode
              panels={[
                {
                  file: 'src/theme/components/source.ts',
                  language: 'ts',
                  highlightLines: [3],
                  lines: [
                    'export const source = {',
                    '  text: type.chrome,',
                    "  prefix: literal('Source ·'),",
                    '} as const;',
                  ],
                },
              ]}
            />,
          ],
        }}
        right={{
          label: 'The rule',
          items: [
            <SlideDefinitions
              items={[
                {
                  term: 'SLIDE_THEME',
                  body: 'Where lengths and colors live.',
                },
                {
                  term: 'styles.ts',
                  body: 'Reads tokens. It never types a value the theme could name.',
                },
                {
                  term: '1fr, 50%',
                  body: 'CSS mechanics, not design tokens, so they stay inline.',
                },
              ]}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
