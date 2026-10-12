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
          <SlideBulletList
            marker="check"
            items={[
              'React and HTML',
              'Markdown and plain text',
              'Slack Block Kit',
              'SVG and PNG',
            ]}
          />
        </TitleAside>
      </TitleSlide>
      <SlideFooter {...footer} />
    </SlideFrame>
  </Composition>
);

export const splitSlide: SlideComposition = toComposition(
  <Composition title="One tree, every surface">
    <SlideFrame>
      <SlideHeading
        title="A slide is **one composition**"
        lede="The same tree renders here, in Markdown, and in Slack."
      />
      <SlideSplitLayout ratio="wideLeft" divider="arrow">
        <SplitPane>
          <SlideCode
            panels={[
              {
                file: 'slide.ts',
                language: 'ts',
                lines: [
                  'runtime.surfaces.markdown.render(slide);',
                  'runtime.surfaces.slack.render(slide);',
                  'runtime.surfaces.snapshot.render(slide);',
                ],
              },
            ]}
          />
        </SplitPane>
        <SplitPane label="Surfaces" tone="primary">
          <SlideBulletList items={['Markdown', 'Slack blocks', 'An image']} />
        </SplitPane>
      </SlideSplitLayout>
      <SlideFooter {...footer} section="Primitives" sectionNumber="01" />
    </SlideFrame>
  </Composition>
);

export const deck: SlideComposition[] = [titleSlide, splitSlide];
