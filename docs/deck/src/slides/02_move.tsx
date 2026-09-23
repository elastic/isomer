/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideBulletList,
  SlideCode,
  SlideFrame,
  SlideSplit,
  SlideStack,
  SlideTitle,
  toComposition,
} from '../shim';

import { titleSlide } from './00_title';

export const moveSlide = toComposition(
  <Slide title="The move">
    <SlideFrame {...frame} chapter="The move" chapterNumber="02">
      <SlideSplit
        ratio="wideRight"
        left={
          <SlideStack>
            <SlideTitle
              eyebrow="Composition"
              title="Move the shared part into one typed document."
              lede="A Composition says what the answer is, never how it looks."
              size="compact"
            />
            <SlideBulletList
              marker="check"
              items={[
                'Validated against the primitives a runtime holds',
                'Rendered by every surface from the same value',
                'Plain JSON, so a model can write one',
              ]}
            />
          </SlideStack>
        }
        right={
          <SlideCode label="Slide 00, as the runtime sees it" language="json">
            {JSON.stringify(titleSlide, null, 2)}
          </SlideCode>
        }
      />
    </SlideFrame>
  </Slide>
);
