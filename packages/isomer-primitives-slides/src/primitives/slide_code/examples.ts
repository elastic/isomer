/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCodeNode, SlideCodePanel } from './schema';

/** Canonical {@link SlideCodeNode} example. */
export const example: SlideCodeNode = {
  type: 'slideCode',
  file: 'refund.ts',
  language: 'ts',
  text: [
    'export const refund = async (order: Order) => {',
    '  await ledger.write(order.id, -order.total);',
    '  await fraud.check(order);',
    '  return notify(order.customer);',
    '};',
  ].join('\n'),
  lineNumbers: { highlight: '2' },
};

/** No caption, no language, and a blank line. */
export const bareExample: SlideCodeNode = {
  type: 'slideCode',
  text: ['npm run release -- --dry-run', '', 'npm run release'].join('\n'),
};

/** A JSON order at the most lines a panel takes. */
export const orderPanel: SlideCodePanel = {
  file: 'An order, as the ledger stores it',
  language: 'json',
  text: [
    '{',
    '  "id": "ord_4821",',
    '  "customer": "cus_190",',
    '  "status": "refunded",',
    '',
    '  "items": [',
    '    { "sku": "OAT-1L", "qty": 2 },',
    '    { "sku": "EGG-12", "qty": 1 }',
    '  ],',
    '  "total": 1149,',
    '  "currency": "EUR",',
    '  "refund": {',
    '    "amount": 1149,',
    '    "settled": "2026-03-02"',
    '  }',
    '}',
  ].join('\n'),
  lineNumbers: { highlight: '4, 12-14' },
};

/** The most lines a panel takes. */
export const denseExample: SlideCodeNode = {
  type: 'slideCode',
  ...orderPanel,
};

/** Conformance examples for {@link SlideCodeNode}. */
export const examples: SlideCodeNode[] = [example, bareExample, denseExample];
