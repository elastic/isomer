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
  SlideStack,
  SlideTitle,
  toComposition,
} from '../shim';

export const problemSlide = toComposition(
  <Slide title="The problem">
    <SlideFrame {...frame} chapter="The problem" chapterNumber="01">
      <SlideTitle
        eyebrow="The pattern, and what changed"
        title="Customers have asked for this for a long time."
        lede="The same request, under a different name each year: show the answer somewhere lighter than Kibana. Mobile, email, Slack, and now agents all point at the same missing layer."
      />
      <SlideStack>
        <SlideCardGroup columns={4}>
          <SlideCard
            badge="2018"
            label="Mobile"
            title="Show me dashboards on my phone."
            tone="pink">
            Got: use Kibana in a mobile browser. The chrome never shrank.
          </SlideCard>
          <SlideCard
            badge="2020"
            label="Email"
            title="Send a compact summary in email."
            tone="pink">
            Got: a scheduled PNG screenshot, or a 14 MB PDF report.
          </SlideCard>
          <SlideCard
            badge="2022"
            label="Slack"
            title="Render the alert in the thread."
            tone="pink">
            Got: an alert string and a link back to Kibana.
          </SlideCard>
          <SlideCard
            badge="2025"
            label="Agents"
            title="Render the answer in the conversation."
            tone="primary">
            Got: a prose summary of a dashboard, without the view, the source,
            or its structure.
          </SlideCard>
        </SlideCardGroup>
        <SlideCardGroup columns={1}>
          <SlideCard
            label="What changed"
            title="For years the answer has been “open Kibana”."
            tone="primary">
            Every channel built its own renderer, and each one collapsed to a
            link whenever the host was smaller, flatter, asynchronous, or
            text-only. Agents make the gap obvious; the others have been asking
            for the same layer all along.
          </SlideCard>
        </SlideCardGroup>
      </SlideStack>
    </SlideFrame>
  </Slide>
);
