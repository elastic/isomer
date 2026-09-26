/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideList,
  SlideSplit,
  SlideTree,
  toComposition,
} from '../shim';

export const anatomySlide = toComposition(
  <Slide title="A primitive is one folder">
    <SlideFrame {...frame} chapterNumber="04" chapter="Building a pack">
      <SlideHeading
        title="A primitive is one folder"
        lede="Schema, catalog copy, examples, renderers, styles, and tests sit together."
      />
      <SlideSplit
        ratio="wideLeft"
        left={{
          items: [
            <SlideTree
              root="slide_table/"
              entries={[
                {
                  name: 'catalog.ts',
                  body: 'When to use it, when not to, one example',
                },
                {
                  name: 'examples.ts',
                  body: 'The cases conformance renders',
                },
                { name: 'index.test.ts', body: 'What conformance cannot know' },
                {
                  name: 'index.tsx',
                  body: 'Text, markdown, Slack, and the definition',
                },
                {
                  name: 'react.tsx',
                  body: 'React, HTML, and the image surface',
                },
                {
                  name: 'schema.ts',
                  body: 'The validator and the node type',
                },
                {
                  name: 'styles.ts',
                  body: 'Its CSS module, from theme tokens',
                },
              ]}
            />,
          ],
        }}
        right={{
          items: [
            <SlideList
              label="Outside the folder"
              items={[
                {
                  term: 'registry.ts',
                  body: 'Registers it, with body_node.ts',
                },
                {
                  term: 'components/',
                  body: 'Its theme group of values',
                },
                {
                  term: 'stylesheet.ts',
                  body: 'Adds its module to the CSS',
                },
                {
                  term: 'conformance',
                  body: 'Renders every example everywhere',
                },
              ]}
              footnote={`All ${slideDeckPrimitives.length} primitives follow this layout, so a new one starts as a copy of its nearest neighbor.`}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
