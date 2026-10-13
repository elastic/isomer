/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideDiffNode } from './schema';

/** Canonical {@link SlideDiffNode} example. */
export const example: SlideDiffNode = {
  type: 'slideDiff',
  file: 'refund.ts · before and after',
  language: 'ts',
  text: [
    'export const refund = async (order: Order) => {',
    '  await fraud.check(order);',
    '  await ledger.write(order.id, -order.total);',
    '  await fraud.check(order);',
    '  return notify(order.customer);',
    '};',
  ].join('\n'),
  remove: '2',
  add: '4',
  lineNumbers: { start: 12 },
};

export const configExample: SlideDiffNode = {
  type: 'slideDiff',
  language: 'yaml',
  text: [
    'checkout:',
    '  timeout: 30s',
    '  timeout: 10s',
    '  retries: 3',
    '',
    '  currency: EUR',
  ].join('\n'),
  remove: '2',
  add: '3-4',
};

/** A long change at the dense size. */
export const denseExample: SlideDiffNode = {
  type: 'slideDiff',
  file: 'order.json · after the refund',
  language: 'json',
  text: [
    '{',
    '  "id": "ord_4821",',
    '  "customer": "cus_190",',
    '  "status": "paid",',
    '  "status": "refunded",',
    '  "items": [{ "sku": "OAT-1L", "qty": 2 }],',
    '  "total": 1149,',
    '  "currency": "EUR"',
    '  "currency": "EUR",',
    '  "refund": {',
    '    "amount": 1149,',
    '    "settled": "2026-03-02"',
    '  }',
    '}',
  ].join('\n'),
  remove: '4, 8',
  add: '5, 9-13',
  lineNumbers: true,
};

/** Conformance examples for {@link SlideDiffNode}. */
export const examples: SlideDiffNode[] = [example, configExample, denseExample];
