/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, twoColumnsExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideRoadmapNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: SlideRoadmapNode): string =>
  serializeMarkdown(markdownContent(node));

describe('slideRoadmap', () => {
  it('holds two to four columns of one to four items', () => {
    const [column] = example.columns;
    expect(schema.safeParse({ ...example, columns: [column] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, columns: Array(5).fill(column) }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...twoColumnsExample,
        columns: [{ ...column, items: [] }, column],
      }).success
    ).toBe(false);
  });

  it('rejects more than one current column', () => {
    const [first, second, ...rest] = example.columns;
    const { errors } = runtime.validate(
      compose({
        ...example,
        columns: [
          { ...first, current: true },
          { ...second, current: true },
          ...rest,
        ],
      })
    );
    expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
      'body[0].body[0].columns: at most one column can be current',
    ]);
  });

  it('marks the current column for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it('renders text and markdown with the current column marked', () => {
    expect(text(twoColumnsExample)).toMatchInlineSnapshot(`
      "THIS HALF · Committed
      - Faster payouts: Merchants are paid the next business day
      - Dispute inbox: Every chargeback in one queue

      NEXT HALF · Exploring
      - Instant payouts: Paid within minutes, for a small fee"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "## Now · Shipped (now)

      - **Saved baskets**: Reorder last week’s shop in one tap
      - **Card on file**: Checkout without retyping a card

      ## Next · In build

      - **Substitutions**: Approve a swap from a message
      - **Delivery slots**: Pick a one-hour window
      - **Receipts**: Itemized, in the app and by \`email\`

      ## Later · Proposed

      - **Shared lists**: One basket for the whole household
      - **Price alerts**: A nudge when a staple goes on sale
      - **Pantry**: Suggest what is running low
      - **Recipes**: Add every ingredient in one step"
    `);
  });

  it('renders Slack as a bold horizon over a list, per column', () => {
    expect(slack(twoColumnsExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "This half · Committed",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Faster payouts",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Merchants are paid the next business day",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Dispute inbox",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Every chargeback in one queue",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "Next half · Exploring",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Instant",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": " payouts",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Paid within minutes, for a small fee",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});
