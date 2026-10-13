/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A deck is a `Composition[]`, a sequence Isomer does not model: sequencing is routing, and routing belongs to the host.

import type { Composition as SlideComposition } from '@elastic/isomer-sdk';

import { slideJsx } from '../jsx';

const {
  Composition,
  SlideBulletList,
  SlideCode,
  SlideFrame,
  SlideHeading,
  SlideSplitLayout,
  TitleSlide,
  toComposition,
} = slideJsx;

const footer = {
  brand: 'Isomer',
  url: 'https://elastic.github.io/isomer',
};

export const titleSlide: SlideComposition = toComposition(
  <Composition title="Isomer">
    <SlideFrame tone="inverse">
      <TitleSlide
        eyebrow="Reference pack"
        title="Isomer"
        tagline="One composition, **every surface**.">
        <TitleSlide.Aside>
          <SlideBulletList marker="check">
            <SlideBulletList.Item>React and HTML</SlideBulletList.Item>
            <SlideBulletList.Item>Markdown and plain text</SlideBulletList.Item>
            <SlideBulletList.Item>Slack Block Kit</SlideBulletList.Item>
            <SlideBulletList.Item>SVG and PNG</SlideBulletList.Item>
          </SlideBulletList>
        </TitleSlide.Aside>
      </TitleSlide>
      <SlideFrame.Footer {...footer} />
    </SlideFrame>
  </Composition>
);

export const splitSlide: SlideComposition = toComposition(
  <Composition title="One tree, every surface">
    <SlideFrame>
      <SlideHeading lede="The same tree renders here, in Markdown, and in Slack.">
        A slide is **one composition**
      </SlideHeading>
      <SlideSplitLayout ratio="wideLeft" divider="arrow">
        <SlideSplitLayout.Pane>
          <SlideCode file="slide.ts" language="ts">
            {`
              runtime.surfaces.markdown.render(slide);
              runtime.surfaces.slack.render(slide);
              runtime.surfaces.snapshot.render(slide);
            `}
          </SlideCode>
        </SlideSplitLayout.Pane>
        <SlideSplitLayout.Pane label="Surfaces" tone="primary">
          <SlideBulletList>
            <SlideBulletList.Item>Markdown</SlideBulletList.Item>
            <SlideBulletList.Item>Slack blocks</SlideBulletList.Item>
            <SlideBulletList.Item>An image</SlideBulletList.Item>
          </SlideBulletList>
        </SlideSplitLayout.Pane>
      </SlideSplitLayout>
      <SlideFrame.Footer {...footer} section="Primitives" sectionNumber="01" />
    </SlideFrame>
  </Composition>
);

export const deck: SlideComposition[] = [titleSlide, splitSlide];
