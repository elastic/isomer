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

import { example, scaledExample } from './examples';
import { markdown as markdownContent, text } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: object) =>
  runtime.validate(compose(node)).errors.map(({ path }) => path);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const html = (node: object): string =>
  runtime.surfaces.html.render(compose(node)).html;

describe('slideBars', () => {
  it('highlights one bar at most, under a max at least every value', () => {
    const [first, second] = example.items;
    expect(
      errorPaths({
        ...example,
        items: [
          { ...first, highlight: true },
          { ...second, highlight: true },
        ],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].items",
      ]
    `);
    expect(errorPaths({ ...example, max: 100 })).toMatchInlineSnapshot(`
      [
        "body[0].body[0].max",
      ]
    `);
    expect(errorPaths({ ...example, items: [{ ...first, value: -1 }, second] }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].items[0].value",
      ]
    `);
  });

  it('renders text and markdown as tables, the highlighted row bold', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Label    Value  Detail
      -------  -----  ----------------------
      Leeds    412    orders packed per hour
      Bristol  356    orders packed per hour
      Glasgow  298    orders packed per hour
      Cardiff  214    orders packed per hour
      Belfast  130    opened in March"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "| Label | Value | Detail |
      | - | - | - |
      | Leeds | 412 | orders packed per hour |
      | **Bristol** | **356** | **orders packed per hour** |
      | Glasgow | 298 | orders packed per hour |
      | Cardiff | 214 | orders packed per hour |
      | Belfast | 130 | opened in March |"
    `);
    expect(markdown(scaledExample)).toMatchInlineSnapshot(`
      "| Label | Value |
      | - | - |
      | Search | 92 |
      | Checkout | 88 |
      | Basket | 81 |
      | Account | 74 |
      | **Reviews** | **63** |
      | Wishlist | 51 |"
    `);
  });

  it('renders Slack as a native table', () => {
    expect(runtime.surfaces.slack.renderNode(scaledExample).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "column_settings": [
            {
              "is_wrapped": true,
            },
            {
              "is_wrapped": true,
            },
          ],
          "rows": [
            [
              {
                "text": "Label",
                "type": "raw_text",
              },
              {
                "text": "Value",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Search",
                "type": "raw_text",
              },
              {
                "text": "92",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Checkout",
                "type": "raw_text",
              },
              {
                "text": "88",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Basket",
                "type": "raw_text",
              },
              {
                "text": "81",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Account",
                "type": "raw_text",
              },
              {
                "text": "74",
                "type": "raw_text",
              },
            ],
            [
              {
                "elements": [
                  {
                    "elements": [
                      {
                        "style": {
                          "bold": true,
                        },
                        "text": "Reviews",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
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
                        "text": "63",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
                  },
                ],
                "type": "rich_text",
              },
            ],
            [
              {
                "text": "Wishlist",
                "type": "raw_text",
              },
              {
                "text": "51",
                "type": "raw_text",
              },
            ],
          ],
          "type": "table",
        },
      ]
    `);
  });

  it('prints every value beside a bar drawn to scale', () => {
    const page = html(scaledExample);
    expect(page).toContain('style="width:78.2%"');
    expect(page).toContain('>92</span>');
  });
});
