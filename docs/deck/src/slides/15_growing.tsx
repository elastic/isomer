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
  SlideFrame,
  SlideSplit,
  SlideTable,
  SlideTitle,
  toComposition,
} from '../shim';

export const growingSlide = toComposition(
  <Slide title="Growing a pack">
    <SlideFrame {...frame} chapter="Growing a pack" chapterNumber="15">
      <SlideTitle
        title="What it took to add four primitives."
        lede="Each one exercises a part of the contract the pack had not shown yet."
        size="compact"
      />
      <SlideSplit
        ratio="wideLeft"
        left={
          <SlideTable
            columns={['Primitive', 'Kind', 'Shows how to']}
            rowHeaders
            rows={[
              ['slideTable', 'Leaf', 'Add a native Slack renderer'],
              ['slideTranscript', 'Leaf', 'Style an enum with variants()'],
              ['slideWindow', 'Container', 'Draw chrome around children'],
              ['slideCycle', 'Leaf', 'Paint inside an inline svg'],
            ]}
          />
        }
        right={
          <SlideBulletList
            label="Every one also"
            marker="check"
            items={[
              'Joined registry.ts and body_node.ts',
              'Took every value from SLIDE_THEME',
              'Passed the SDK conformance suite',
              'Shipped examples, catalog copy, and docs',
            ]}
          />
        }
      />
    </SlideFrame>
  </Slide>
);
