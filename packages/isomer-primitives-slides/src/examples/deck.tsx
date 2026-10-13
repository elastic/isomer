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
        <TitleSlide.TitleAside>
          <SlideBulletList marker="check">
            <SlideBulletList.BulletItem>
              React and HTML
            </SlideBulletList.BulletItem>
            <SlideBulletList.BulletItem>
              Markdown and plain text
            </SlideBulletList.BulletItem>
            <SlideBulletList.BulletItem>
              Slack Block Kit
            </SlideBulletList.BulletItem>
            <SlideBulletList.BulletItem>SVG and PNG</SlideBulletList.BulletItem>
          </SlideBulletList>
        </TitleSlide.TitleAside>
      </TitleSlide>
      <SlideFrame.SlideFooter {...footer} />
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
        <SlideSplitLayout.SplitPane>
          <SlideCode>
            <SlideCode.CodePanel file="slide.ts" language="ts">
              {`
                runtime.surfaces.markdown.render(slide);
                runtime.surfaces.slack.render(slide);
                runtime.surfaces.snapshot.render(slide);
              `}
            </SlideCode.CodePanel>
          </SlideCode>
        </SlideSplitLayout.SplitPane>
        <SlideSplitLayout.SplitPane label="Surfaces" tone="primary">
          <SlideBulletList>
            <SlideBulletList.BulletItem>Markdown</SlideBulletList.BulletItem>
            <SlideBulletList.BulletItem>
              Slack blocks
            </SlideBulletList.BulletItem>
            <SlideBulletList.BulletItem>An image</SlideBulletList.BulletItem>
          </SlideBulletList>
        </SlideSplitLayout.SplitPane>
      </SlideSplitLayout>
      <SlideFrame.SlideFooter
        {...footer}
        section="Primitives"
        sectionNumber="01"
      />
    </SlideFrame>
  </Composition>
);

export const deck: SlideComposition[] = [titleSlide, splitSlide];
