/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlidePipelineNode } from './schema';

/** Canonical {@link SlidePipelineNode} example. */
export const example: SlidePipelineNode = {
  type: 'slidePipeline',
  start: 'Refund request',
  end: 'Ledger entry',
  steps: [
    {
      title: 'Verify',
      body: 'Match the order, the amount, and the card on file. A mismatch goes to **a person**.',
    },
    {
      title: 'Score',
      body: 'The fraud model scores the request against the customer’s last ninety days.',
    },
    {
      title: 'Approve',
      body: 'Scores under the threshold approve on their own; the rest wait for review.',
    },
    {
      title: 'Settle',
      body: 'The processor returns the funds and posts one line to the ledger.',
    },
  ],
};

/** No input or output chips. */
export const bareStepsExample: SlidePipelineNode = {
  type: 'slidePipeline',
  steps: [
    { title: 'Branch', body: 'Cut the `release` branch on Monday morning.' },
    {
      title: 'Soak',
      body: 'Run it in staging for two days under replayed traffic.',
    },
    {
      title: 'Ship',
      body: 'Roll out by region, watching error budgets between each.',
    },
  ],
};

/** The most steps a pipeline takes, each with a body. */
export const fullExample: SlidePipelineNode = {
  type: 'slidePipeline',
  steps: [
    { title: 'Commit', body: 'A merge to `main` starts the run.' },
    { title: 'Build', body: 'One image per service, tagged by commit.' },
    { title: 'Test', body: 'Unit and contract suites run in parallel.' },
    { title: 'Stage', body: 'The image serves replayed traffic for an hour.' },
    {
      title: 'Approve',
      body: 'An owner signs off on the diff and the graphs.',
    },
    {
      title: 'Release',
      body: 'Regions update one at a time, watching errors.',
    },
  ],
};

/** Spans mode: chips bracketed by who owns each run. */
export const spansExample: SlidePipelineNode = {
  type: 'slidePipeline',
  steps: [
    { title: 'Basket' },
    { title: 'Checkout' },
    { title: 'Payment intent' },
    { title: 'Card network' },
    { title: 'Bank' },
  ],
  spans: [
    {
      from: 0,
      to: 2,
      tone: 'primary',
      label: 'Our app',
      title: 'We own the basket to the intent',
      body: 'Every step here ships with the app and is covered by our own tests.',
    },
    {
      from: 3,
      to: 4,
      tone: 'accent',
      label: 'Partners',
      title: 'Settlement is theirs',
      body: 'The network and the bank decide timing; we only see the result.',
    },
  ],
};

/** The most spans a pipeline takes, two of them over a single step. */
export const threeSpansExample: SlidePipelineNode = {
  type: 'slidePipeline',
  steps: [
    { title: 'Picker' },
    { title: 'Packing' },
    { title: 'Van' },
    { title: 'Doorstep' },
  ],
  spans: [
    {
      from: 0,
      to: 1,
      tone: 'primary',
      label: 'Store',
      title: 'Picked in aisle order',
      body: 'The route follows the store map.',
    },
    {
      from: 2,
      to: 2,
      tone: 'accent',
      label: 'Courier',
      title: 'Batched by postcode',
      body: 'Vans leave every forty minutes.',
    },
    {
      from: 3,
      to: 3,
      tone: 'primary',
      label: 'App',
      title: 'Photo on delivery',
      body: 'The customer sees it at once.',
    },
  ],
};

/** Conformance examples for {@link SlidePipelineNode}. */
export const examples: SlidePipelineNode[] = [
  example,
  bareStepsExample,
  fullExample,
  spansExample,
  threeSpansExample,
];
