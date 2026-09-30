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

import {
  example,
  fullExample,
  spansExample,
  threeSpansExample,
} from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { pipelineMaxSpans, pipelineMaxSteps } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errors = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slidePipeline', () => {
  // The fit test measures these, so they hold the most steps and spans a pipeline takes.
  it('pins the fullest examples at the caps', () => {
    expect(fullExample.steps).toHaveLength(pipelineMaxSteps);
    expect(fullExample.steps.every(({ body }) => body)).toBe(true);
    expect(threeSpansExample.spans).toHaveLength(pipelineMaxSpans);
  });

  it('keeps spans in range, apart, and free of steps-mode fields', () => {
    const [first, second] = spansExample.spans ?? [];
    expect(
      errors({
        ...spansExample,
        start: 'In',
        size: 's',
        steps: [{ title: 'Basket', body: 'Held.' }, ...spansExample.steps],
        spans: [
          { ...first, to: 9 },
          { ...second, from: 1 },
        ],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].spans: each span needs \`from\` ≤ \`to\` < the number of steps",
        "body[0].body[0].spans: spans must not overlap",
        "body[0].body[0].spans: \`start\` and \`end\` are steps mode only; with \`spans\`, make them the first and last steps",
        "body[0].body[0].size: \`size\` is steps mode only; spans-mode chips take one size",
        "body[0].body[0].steps: step bodies are steps mode only; with \`spans\`, put the detail in the span’s body",
      ]
    `);
  });

  it('runs no cross-field check once a count is over its cap', () => {
    const [span] = spansExample.spans ?? [];
    const found = errors({
      ...spansExample,
      steps: [{ title: 'In', body: 'Held.' }, ...spansExample.steps],
      spans: Array.from({ length: pipelineMaxSpans + 1 }, () => span),
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/^body\[0\]\.body\[0\]\.spans: /);
  });

  it('renders text and markdown in steps mode', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Refund request → Verify → Score → Approve → Settle → Ledger entry
      1. Verify — Match the order, the amount, and the card on file. A mismatch goes to a person.
      2. Score — The fraud model scores the request against the customer’s last ninety days.
      3. Approve — Scores under the threshold approve on their own; the rest wait for review.
      4. Settle — The processor returns the funds and posts one line to the ledger."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "Refund request → Verify → Score → Approve → Settle → Ledger entry

      1. **Verify** — Match the order, the amount, and the card on file. A mismatch goes to **a person**.
      2. **Score** — The fraud model scores the request against the customer’s last ninety days.
      3. **Approve** — Scores under the threshold approve on their own; the rest wait for review.
      4. **Settle** — The processor returns the funds and posts one line to the ledger."
    `);
  });

  it('renders text and markdown in spans mode', () => {
    expect(text(spansExample)).toMatchInlineSnapshot(`
      "Basket → Checkout → Payment intent → Card network → Bank
      ● OUR APP (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
      ○ PARTNERS (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result."
    `);
    expect(markdown(spansExample)).toMatchInlineSnapshot(`
      "Basket → Checkout → Payment intent → Card network → Bank

      - ● **OUR APP** (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
      - ○ **PARTNERS** (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result."
    `);
  });

  it('names what each bracket covers for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(spansExample));
    expect(html).toContain(
      'role="img" aria-label="Basket leads to Payment intent"'
    );
  });

  it('renders Slack as the chain and a list of steps or spans', () => {
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "Refund request → Verify → Score → Approve → Settle → Ledger entry",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Verify",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "Match the order, the amount, and the card on file. A mismatch goes to ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "a person",
                      "type": "text",
                    },
                    {
                      "text": ".",
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
                      "text": "Score",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "The fraud model scores the request against the customer’s last ninety days.",
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
                      "text": "Approve",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "Scores under the threshold approve on their own; the rest wait for review.",
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
                      "text": "Settle",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "The processor returns the funds and posts one line to the ledger.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "ordered",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
    expect(runtime.surfaces.slack.renderNode(spansExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "elements": [
              {
                "text": "Basket → Checkout → Payment intent → Card network → Bank",
                "type": "mrkdwn",
              },
            ],
            "type": "context",
          },
          {
            "elements": [
              {
                "elements": [
                  {
                    "elements": [
                      {
                        "text": "● ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "bold": true,
                        },
                        "text": "OUR APP",
                        "type": "text",
                      },
                      {
                        "text": " (Basket → Payment intent): ",
                        "type": "text",
                      },
                      {
                        "text": "We own the basket to the intent",
                        "type": "text",
                      },
                      {
                        "text": " — ",
                        "type": "text",
                      },
                      {
                        "text": "Every step here ships with the app and is covered by our own tests.",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
                  },
                  {
                    "elements": [
                      {
                        "text": "○ ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "bold": true,
                        },
                        "text": "PARTNERS",
                        "type": "text",
                      },
                      {
                        "text": " (Card network → Bank): ",
                        "type": "text",
                      },
                      {
                        "text": "Settlement is theirs",
                        "type": "text",
                      },
                      {
                        "text": " — ",
                        "type": "text",
                      },
                      {
                        "text": "The network and the bank decide timing; we only see the result.",
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

  it('prints a chain holding a mrkdwn delimiter as literal rich text', () => {
    const [chain] = slack({
      ...example,
      start: 'order_id',
    });
    expect(chain).toMatchObject({ type: 'rich_text' });
    expect(slack(example)[0]).toMatchObject({ type: 'context' });
  });

  it.each([Number.NaN, Infinity, -Infinity])(
    'refuses a span index of %s',
    (index) => {
      const [first, second] = spansExample.spans ?? [];
      expect(
        errors({
          ...spansExample,
          spans: [{ ...first, from: index }, second],
        }).some((error) => error.startsWith('body[0].body[0].spans[0].from:'))
      ).toBe(true);
    }
  );
});
