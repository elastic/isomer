/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderPanel } from '../slide_code/examples';

import type { SlideCodeTraceNode } from './schema';

/** Canonical {@link SlideCodeTraceNode} example. */
export const example: SlideCodeTraceNode = {
  type: 'slideCodeTrace',
  panels: [
    {
      file: 'config.yaml',
      language: 'yaml',
      text: ['checkout:', '  timeout: 30s', '  retries: 3'].join('\n'),
      lineNumbers: { highlight: '2' },
    },
    {
      file: 'client.ts',
      language: 'ts',
      text: [
        'const client = createClient({',
        '  timeout: config.checkout.timeout,',
        '  retries: config.checkout.retries,',
        '});',
      ].join('\n'),
      lineNumbers: { start: 41, highlight: '42-43' },
    },
  ],
};

/** Two panels at the most lines each. */
export const denseExample: SlideCodeTraceNode = {
  type: 'slideCodeTrace',
  panels: [
    { ...orderPanel, file: 'order.json' },
    {
      file: 'refund.ts',
      language: 'ts',
      text: [
        'const refund = async (id) => {',
        '  const order = await load(id);',
        '  if (order.status !== "paid") {',
        '    return;',
        '  }',
        '',
        '  await ledger.write({',
        '    id: order.id,',
        '    amount: -order.total,',
        '  });',
        '  await payments.refund({',
        '    order: order.id,',
        '    amount: order.total,',
        '  });',
        '  return notify(order.customer);',
        '};',
      ].join('\n'),
      lineNumbers: { start: 120, highlight: '126-129' },
    },
  ],
};

/** Conformance examples for {@link SlideCodeTraceNode}. */
export const examples: SlideCodeTraceNode[] = [example, denseExample];
