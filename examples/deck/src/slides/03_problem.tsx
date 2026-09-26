/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideTimeline,
  toComposition,
} from '../shim';

export const problemSlide = toComposition(
  <Slide title="Every channel has asked for the same missing layer">
    <SlideFrame {...frame} sectionNumber="01" section="The problem">
      <SlideHeading
        title="Every channel has asked for the same missing layer"
        lede="Each wanted the answer somewhere lighter than Kibana. Each time, the answer collapsed to a link back to it."
      />
      <SlideTimeline
        items={[
          {
            label: '2018',
            channel: 'Mobile',
            heading: 'Show me dashboards on my phone.',
            body: 'Got Kibana in a mobile browser. The chrome never shrank.',
          },
          {
            label: '2020',
            channel: 'Email',
            heading: 'Send a compact summary in email.',
            body: 'Got a scheduled PNG screenshot, or a 14 MB PDF report.',
          },
          {
            label: '2022',
            channel: 'Slack',
            heading: 'Render the alert in the thread.',
            body: 'Got an alert string and a link back to Kibana.',
          },
          {
            label: '2025',
            channel: 'Agents',
            heading: 'Render the answer in the conversation.',
            body: 'Got a prose summary of a dashboard, without the view, the source, or its structure.',
            current: true,
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
