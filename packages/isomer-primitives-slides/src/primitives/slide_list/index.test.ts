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

import { example, mixedExample } from './examples';
import { markdown as markdownContent, text } from './index';
import type { SlideListNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const oneItem: SlideListNode = { ...example, items: example.items.slice(0, 1) };

describe('slideList', () => {
  it('holds one to six items', () => {
    const paths = (node: object) =>
      runtime.validate(compose(node)).errors.map(({ path }) => path);
    expect(paths({ ...example, items: [] })).toContain('body[0].body[0].items');
    expect(
      paths({ ...example, items: Array(7).fill(example.items[0]) })
    ).toContain('body[0].body[0].items');
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "SHIPPED IN 4.2

      Search: Tolerates typos, even in brand names
      Cart: Survives a lost connection and syncs later
      Checkout: Saves a card with one tap
      Receipts: Arrive by email and in the app

      Each change shipped behind a flag and reached every customer within a week."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "**SHIPPED IN 4.2**

      - **Search**: Tolerates typos, even in brand names
      - **Cart**: Survives a lost connection and syncs later
      - **Checkout**: Saves a card with one tap
      - **Receipts**: Arrive by email and in the app

      Each change shipped behind a flag and reached every customer within a week."
    `);
    expect(markdown(mixedExample)).toMatchInlineSnapshot(`
      "**INCIDENT TIMELINE**

      - **09:12**: Error rate on payments passes two percent
      - **09:15**: On-call engineer paged and acknowledges
      - Twenty minutes spent ruling out the card network
      - **09:47**: Bad config rolled back; errors clear"
    `);
  });

  it('renders Slack as a native list between its label and footnote', () => {
    expect(runtime.surfaces.slack.renderNode(oneItem).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "*SHIPPED IN 4.2*",
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
                      "text": "Search",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Tolerates typos, even in brand names",
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
              "text": "Each change shipped behind a flag and reached every customer within a week.",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });
});
