/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, examples } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

/** Keys whose values are enum choices, not authored copy. */
const enumKeys = new Set(['type', 'tone', 'marker']);

const authored = (value: unknown, key = ''): string[] => {
  if (typeof value === 'string') {
    return enumKeys.has(key) ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => authored(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => authored(v, k));
  }
  return [];
};

const slackText = (value: unknown): string =>
  authored(value)
    .filter(
      (entry) => !/^(mrkdwn|plain_text|section|context|header)$/.test(entry)
    )
    .join('\n');

describe('slideTree', () => {
  it('holds one to ten entries', () => {
    expect(schema.safeParse({ ...example, entries: [] }).success).toBe(false);
    const { errors } = runtime.validate(
      compose({ ...example, entries: Array(11).fill(example.entries[0]) })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].entries');
  });

  it('draws connectors in text and fences them in markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "checkout/
      ├─ cart.ts           Line items, quantities, and the running total
      ├─ pricing.ts        Discounts and tax, applied in a fixed order
      ├─ payment/          One adapter per card network
      ├─ receipt.ts        The email and the in-app copy
      └─ checkout.test.ts  Every path a real order has taken"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "\`\`\`text
      checkout/
      ├─ cart.ts           Line items, quantities, and the running total
      ├─ pricing.ts        Discounts and tax, applied in a fixed order
      ├─ payment/          One adapter per card network
      ├─ receipt.ts        The email and the in-app copy
      └─ checkout.test.ts  Every path a real order has taken
      \`\`\`"
    `);
  });

  it('renders Slack through the markdown fallback', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(example));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "text": "checkout/
      ├─ cart.ts           Line items, quantities, and the running total
      ├─ pricing.ts        Discounts and tax, applied in a fixed order
      ├─ payment/          One adapter per card network
      ├─ receipt.ts        The email and the in-app copy
      └─ checkout.test.ts  Every path a real order has taken",
                  "type": "text",
                },
              ],
              "type": "rich_text_preformatted",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string in example %i',
    (_, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  );
});
