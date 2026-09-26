/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideDiffNode } from './schema';

/** Canonical {@link SlideDiffNode} example: two calls swapped. */
export const example: SlideDiffNode = {
  type: 'slideDiff',
  file: 'refund.ts · before and after',
  language: 'ts',
  lines: [
    { text: 'export const refund = async (order: Order) => {' },
    { text: '  await fraud.check(order);', op: 'remove' },
    { text: '  await ledger.write(order.id, -order.total);' },
    { text: '  await fraud.check(order);', op: 'add' },
    { text: '  return notify(order.customer);' },
    { text: '};' },
  ],
};

/** No caption: one value changed and one added. */
export const configExample: SlideDiffNode = {
  type: 'slideDiff',
  language: 'yaml',
  lines: [
    { text: 'checkout:' },
    { text: '  timeout: 30s', op: 'remove' },
    { text: '  timeout: 10s', op: 'add' },
    { text: '  retries: 3', op: 'add' },
    { text: '' },
    { text: '  currency: EUR' },
  ],
};

/** A long change, set at the dense size. */
export const denseExample: SlideDiffNode = {
  type: 'slideDiff',
  file: 'order.json · after the refund',
  language: 'json',
  lines: [
    { text: '{' },
    { text: '  "id": "ord_4821",' },
    { text: '  "status": "paid",', op: 'remove' },
    { text: '  "status": "refunded",', op: 'add' },
    { text: '  "items": [{ "sku": "OAT-1L", "qty": 2 }],' },
    { text: '  "total": 1149,' },
    { text: '  "currency": "EUR"', op: 'remove' },
    { text: '  "currency": "EUR",', op: 'add' },
    { text: '  "refund": {', op: 'add' },
    { text: '    "amount": 1149,', op: 'add' },
    { text: '    "settled": "2026-03-02"', op: 'add' },
    { text: '  }', op: 'add' },
    { text: '}' },
  ],
};

/** Conformance examples for {@link SlideDiffNode}. */
export const examples: SlideDiffNode[] = [example, configExample, denseExample];
