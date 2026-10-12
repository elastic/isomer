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
  BulletItem,
  CodePanel,
  Composition,
  SlideBulletList,
  SlideCode,
  SlideFooter,
  SlideFrame,
  SlideHeading,
  SlideSplitLayout,
  SplitPane,
  TitleAside,
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
        <TitleAside>
          <SlideBulletList marker="check">
            <BulletItem>React and HTML</BulletItem>
            <BulletItem>Markdown and plain text</BulletItem>
            <BulletItem>Slack Block Kit</BulletItem>
            <BulletItem>SVG and PNG</BulletItem>
          </SlideBulletList>
        </TitleAside>
      </TitleSlide>
      <SlideFooter {...footer} />
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
        <SplitPane>
          <SlideCode>
            <CodePanel file="slide.ts" language="ts">
              {`
                runtime.surfaces.markdown.render(slide);
                runtime.surfaces.slack.render(slide);
                runtime.surfaces.snapshot.render(slide);
              `}
            </CodePanel>
          </SlideCode>
        </SplitPane>
        <SplitPane label="Surfaces" tone="primary">
          <SlideBulletList>
            <BulletItem>Markdown</BulletItem>
            <BulletItem>Slack blocks</BulletItem>
            <BulletItem>An image</BulletItem>
          </SlideBulletList>
        </SplitPane>
      </SlideSplitLayout>
      <SlideFooter {...footer} section="Primitives" sectionNumber="01" />
    </SlideFrame>
  </Composition>
);

export const deck: SlideComposition[] = [titleSlide, splitSlide];
