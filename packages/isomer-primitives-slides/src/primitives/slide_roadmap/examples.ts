/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRoadmapNode } from './schema';

/** Canonical {@link SlideRoadmapNode} example. */
export const example: SlideRoadmapNode = {
  type: 'slideRoadmap',
  columns: [
    {
      title: 'Now',
      status: 'Shipped',
      current: true,
      items: [
        { title: 'Saved baskets', body: 'Reorder last week’s shop in one tap' },
        { title: 'Card on file', body: 'Checkout without retyping a card' },
      ],
    },
    {
      title: 'Next',
      status: 'In build',
      items: [
        { title: 'Substitutions', body: 'Approve a swap from a message' },
        { title: 'Delivery slots', body: 'Pick a one-hour window' },
        { title: 'Receipts', body: 'Itemized, in the app and by `email`' },
      ],
    },
    {
      title: 'Later',
      status: 'Proposed',
      items: [
        { title: 'Shared lists', body: 'One basket for the whole household' },
        { title: 'Price alerts', body: 'A nudge when a staple goes on sale' },
        { title: 'Pantry', body: 'Suggest what is running low' },
        { title: 'Recipes', body: 'Add every ingredient in one step' },
      ],
    },
  ],
};

/** None current. */
export const twoColumnsExample: SlideRoadmapNode = {
  type: 'slideRoadmap',
  columns: [
    {
      title: 'This half',
      status: 'Committed',
      items: [
        {
          title: 'Faster payouts',
          body: 'Merchants are paid the next business day',
        },
        { title: 'Dispute inbox', body: 'Every chargeback in one queue' },
      ],
    },
    {
      title: 'Next half',
      status: 'Exploring',
      items: [
        {
          title: '**Instant** payouts',
          body: 'Paid within minutes, for a small fee',
        },
      ],
    },
  ],
};

/** Four horizons of four items, the most the schema takes. */
export const fullExample: SlideRoadmapNode = {
  type: 'slideRoadmap',
  columns: [
    {
      title: 'Q1',
      status: 'Done',
      items: [
        { title: 'Status page', body: 'Public, updated within five minutes' },
        { title: 'On-call rota', body: 'Two engineers, weekly handover' },
        { title: 'Paging', body: 'Alerts reach a phone, not an inbox' },
        { title: 'Runbooks', body: 'One per alert, linked from the page' },
      ],
    },
    {
      title: 'Q2',
      status: 'In progress',
      current: true,
      items: [
        { title: 'Error budgets', body: 'Each service owns a monthly budget' },
        { title: 'Load tests', body: 'Run nightly against a staging copy' },
        { title: 'Canary deploys', body: 'One percent of traffic goes first' },
        { title: 'Rollback', body: 'One command returns the last build' },
      ],
    },
    {
      title: 'Q3',
      status: 'Planned',
      items: [
        { title: 'Chaos drills', body: 'A zone is switched off each month' },
        { title: 'Tracing', body: 'Every request carries one trace id' },
        { title: 'Cost review', body: 'Spend per service, every sprint' },
        { title: 'Game days', body: 'Rehearse the worst outage twice a year' },
      ],
    },
    {
      title: 'Q4',
      status: 'Proposed',
      items: [
        { title: 'Second region', body: 'Serve reads if the first goes dark' },
        { title: 'Failover', body: 'Writes move over in under a minute' },
        { title: 'Backups', body: 'Restored and checked every week' },
        { title: 'Audit', body: 'An outside review of the whole setup' },
      ],
    },
  ],
};

/** Conformance examples for {@link SlideRoadmapNode}. */
export const examples: SlideRoadmapNode[] = [
  example,
  twoColumnsExample,
  fullExample,
];
