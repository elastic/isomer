/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCodeNode } from './schema';

/** Canonical {@link SlideCodeNode} example. */
export const example: SlideCodeNode = {
  type: 'slideCode',
  panels: [
    {
      file: 'refund.ts',
      language: 'ts',
      lines: [
        'export const refund = async (order: Order) => {',
        '  await ledger.write(order.id, -order.total);',
        '  await fraud.check(order);',
        '  return notify(order.customer);',
        '};',
      ],
      highlightLines: [2],
    },
  ],
};

/** No caption, no language, and a blank line. */
export const bareExample: SlideCodeNode = {
  type: 'slideCode',
  panels: [
    {
      lines: ['npm run release -- --dry-run', '', 'npm run release'],
    },
  ],
};

export const traceExample: SlideCodeNode = {
  type: 'slideCode',
  panels: [
    {
      file: 'config.yaml',
      language: 'yaml',
      lines: ['checkout:', '  timeout: 30s', '  retries: 3'],
      highlightLines: [2],
    },
    {
      file: 'client.ts',
      language: 'ts',
      lines: [
        'const client = createClient({',
        '  timeout: config.checkout.timeout,',
        '  retries: config.checkout.retries,',
        '});',
      ],
      highlightLines: [2],
    },
  ],
};

/** A long panel at the dense size, with two highlights. */
export const denseExample: SlideCodeNode = {
  type: 'slideCode',
  panels: [
    {
      file: 'An order, as the ledger stores it',
      language: 'json',
      lines: [
        '{',
        '  "id": "ord_4821",',
        '  "customer": "cus_190",',
        '  "status": "refunded",',
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
      ],
      highlightLines: [4, 12],
    },
  ],
};

/** Conformance examples for {@link SlideCodeNode}. */
export const examples: SlideCodeNode[] = [
  example,
  bareExample,
  traceExample,
  denseExample,
];
