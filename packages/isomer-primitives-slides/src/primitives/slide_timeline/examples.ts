/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTimelineNode } from './schema';

/** Canonical {@link SlideTimelineNode} example. */
export const example: SlideTimelineNode = {
  type: 'slideTimeline',
  items: [
    {
      label: '2019',
      channel: 'Phone',
      heading: 'Can I order by calling the store?',
      body: 'Staff took orders by hand and keyed them in after close.',
    },
    {
      label: '2021',
      channel: 'Web',
      heading: 'Let me build a basket online.',
      body: 'The site worked, but substitutions still needed a phone call.',
    },
    {
      label: '2023',
      channel: 'App',
      heading: 'Tell me when my driver is close.',
      body: 'Live tracking shipped; the substitution flow stayed **on the web**.',
    },
    {
      label: '2025',
      channel: 'Chat',
      heading: 'Just swap the oat milk if it is out.',
      body: 'Customers now approve substitutions in a message, not a form.',
      current: true,
    },
  ],
};

/** None current. */
export const threeItemsExample: SlideTimelineNode = {
  type: 'slideTimeline',
  items: [
    {
      label: 'Q1',
      channel: 'Pilot',
      heading: 'Can two stores share one picker queue?',
      body: 'Pick times fell by a fifth in the pilot stores.',
    },
    {
      label: 'Q2',
      channel: 'Region',
      heading: 'Roll it out across the north.',
      body: 'Twelve stores moved over in six weeks.',
    },
    {
      label: 'Q3',
      channel: 'National',
      heading: 'Make it the `default` everywhere.',
      body: 'The old queue was switched off in September.',
    },
  ],
};

export const fiveItemsExample: SlideTimelineNode = {
  type: 'slideTimeline',
  items: [
    {
      label: 'Mon',
      channel: 'Detect',
      heading: 'Checkout latency doubled.',
      body: 'An alert fired at 09:12.',
    },
    {
      label: 'Tue',
      channel: 'Triage',
      heading: 'It only hits saved cards.',
      body: 'The token service was retrying twice.',
    },
    {
      label: 'Wed',
      channel: 'Fix',
      heading: 'Drop the second retry.',
      body: 'Latency returned to baseline by noon.',
      current: true,
    },
    {
      label: 'Thu',
      channel: 'Review',
      heading: 'Why did no test catch it?',
      body: 'Load tests used fresh cards only.',
    },
    {
      label: 'Fri',
      channel: 'Follow-up',
      heading: 'Add saved cards to the load mix.',
      body: 'The suite now covers both paths.',
    },
  ],
};

/** Conformance examples for {@link SlideTimelineNode}. */
export const examples: SlideTimelineNode[] = [
  example,
  threeItemsExample,
  fiveItemsExample,
];
