/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideClosingNode } from './schema';

/** Canonical {@link SlideClosingNode} example. */
export const example: SlideClosingNode = {
  type: 'slideClosing',
  title: 'Start here',
  links: [
    {
      label: 'Docs',
      href: 'https://example.com/ledger/docs',
      text: 'example.com/ledger/docs',
    },
    {
      label: 'Runbook',
      href: 'https://example.com/ledger/runbook',
      text: 'example.com/ledger/runbook',
    },
  ],
  paths: [
    {
      title: 'Issue a refund',
      body: 'The refunds guide, then `POST /refunds`',
    },
    { title: 'Reconcile a day', body: 'The settlement report and its columns' },
    {
      title: 'Handle a dispute',
      body: 'The chargeback flow and its deadlines',
    },
    { title: 'Go on call', body: 'The runbook and the escalation list' },
  ],
};

/** One link and no paths. */
export const linkOnlyExample: SlideClosingNode = {
  type: 'slideClosing',
  title: 'Thank you',
  links: [
    {
      label: 'Questions',
      href: 'mailto:payments@example.com',
      text: 'payments@example.com',
    },
  ],
};

/** The most links and paths. */
export const fullExample: SlideClosingNode = {
  type: 'slideClosing',
  title: 'Keep going',
  links: [
    {
      label: 'Docs',
      href: 'https://example.com/docs',
      text: 'example.com/docs',
    },
    {
      label: 'Source',
      href: 'https://example.com/src',
      text: 'example.com/src',
    },
    {
      label: 'Chat',
      href: 'https://example.com/chat',
      text: 'example.com/chat',
    },
    { label: 'Roadmap', href: '/roadmap', text: 'Roadmap' },
  ],
  paths: [
    { title: 'Place an order', body: 'The quick start and the cart API' },
    { title: 'Add a store', body: 'Store onboarding and its stock feed' },
    { title: 'Plan a route', body: 'Courier windows and how they fill' },
    { title: 'Price a basket', body: 'Promotions, taxes, and rounding' },
    { title: 'Read the numbers', body: 'The weekly dashboard, explained' },
  ],
};

/** Conformance examples for {@link SlideClosingNode}. */
export const examples: SlideClosingNode[] = [
  example,
  linkOnlyExample,
  fullExample,
];
