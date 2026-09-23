/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCard,
  SlideCardGroup,
  SlideFrame,
  SlideTitle,
  toComposition,
} from '../shim';

export const problemSlide = toComposition(
  <Slide title="The problem">
    <SlideFrame {...frame} chapter="The problem" chapterNumber="01">
      <SlideTitle
        eyebrow="Why"
        title="Every channel gets its own renderer. They drift."
        lede="A product answers the same question on a page, in Slack, in an email, and in an agent's reply. Each answer is built separately, and each one ends up saying something slightly different."
      />
      <SlideCardGroup columns={4}>
        <SlideCard badge="Page" title="React" tone="primary">
          Components, a design system, a router.
        </SlideCard>
        <SlideCard badge="Slack" title="Block Kit" tone="pink">
          JSON assembled by hand for each alert.
        </SlideCard>
        <SlideCard badge="Email" title="A screenshot" tone="teal">
          A headless browser photographing the page.
        </SlideCard>
        <SlideCard badge="Agent" title="Markdown" tone="warning">
          Whatever the model decided to write this time.
        </SlideCard>
      </SlideCardGroup>
    </SlideFrame>
  </Slide>
);
