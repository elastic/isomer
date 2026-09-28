/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideFanoutNode } from './schema';

/** Canonical {@link SlideFanoutNode} example. */
export const example: SlideFanoutNode = {
  type: 'slideFanout',
  source: 'OrderPlaced',
  targets: [
    { name: 'picking', body: 'Sends the list to the nearest store' },
    {
      name: 'payments',
      body: 'Holds the amount on the card',
      tone: 'accent',
    },
    { name: 'email', body: 'Confirms the order to the customer' },
    { name: 'courier', body: 'Books a delivery window' },
  ],
};

/** The fewest targets. */
export const pairExample: SlideFanoutNode = {
  type: 'slideFanout',
  source: 'release tag',
  targets: [
    { name: 'changelog', body: 'Drafted from merged pull requests' },
    { name: 'registry', body: 'Receives the signed build' },
  ],
};

/** The most targets. */
export const wideExample: SlideFanoutNode = {
  type: 'slideFanout',
  source: 'incident',
  targets: [
    { name: 'pager', body: 'Wakes the on-call engineer' },
    { name: 'status page', body: 'Posts a first notice' },
    { name: 'chat', body: 'Opens a war room channel' },
    { name: 'timeline', body: 'Starts recording events' },
    { name: 'support', body: 'Tags incoming tickets' },
    { name: 'review', body: 'Schedules the retrospective' },
  ],
};

/** Conformance examples for {@link SlideFanoutNode}. */
export const examples: SlideFanoutNode[] = [example, pairExample, wideExample];
