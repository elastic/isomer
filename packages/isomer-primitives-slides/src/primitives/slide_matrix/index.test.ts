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

import { example, pairExample } from './examples';
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

describe('slideMatrix', () => {
  it('holds one mark per column and highlights a column that exists', () => {
    const [first, ...rest] = pairExample.rows;
    expect(errorPaths({ ...pairExample, highlight: 2 })).toMatchInlineSnapshot(`
      [
        "body[0].body[0].highlight",
      ]
    `);
    expect(
      errorPaths({
        ...pairExample,
        rows: [{ ...first, marks: ['full'] }, ...rest],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].rows[0].marks",
      ]
    `);
  });

  it('renders text and markdown as tables of mark words', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "                 Card  Wallet   Bank     Invoice
      ---------------  ----  -------  -------  -------
      Instant capture  Yes   Yes      No       No
      Partial refunds  Yes   Partial  Yes      No
      Recurring        Yes   Partial  Yes      Yes
      Disputes         Yes   Yes      Partial  No"
    `);
    expect(markdown(pairExample)).toMatchInlineSnapshot(`
      "| | Basic | **Plus** |
      | - | - | - |
      | Free delivery | No | Yes |
      | Order tracking | Yes | Yes |
      | Priority slots | No | Yes |"
    `);
  });

  it('renders Slack as a native table, the highlighted heading bold', () => {
    expect(runtime.surfaces.slack.renderNode(pairExample).blocks)
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
            {
              "is_wrapped": true,
            },
          ],
          "rows": [
            [
              {
                "text": "",
                "type": "raw_text",
              },
              {
                "text": "Basic",
                "type": "raw_text",
              },
              {
                "elements": [
                  {
                    "elements": [
                      {
                        "style": {
                          "bold": true,
                        },
                        "text": "Plus",
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
                "text": "Free delivery",
                "type": "raw_text",
              },
              {
                "text": "No",
                "type": "raw_text",
              },
              {
                "text": "Yes",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Order tracking",
                "type": "raw_text",
              },
              {
                "text": "Yes",
                "type": "raw_text",
              },
              {
                "text": "Yes",
                "type": "raw_text",
              },
            ],
            [
              {
                "text": "Priority slots",
                "type": "raw_text",
              },
              {
                "text": "No",
                "type": "raw_text",
              },
              {
                "text": "Yes",
                "type": "raw_text",
              },
            ],
          ],
          "type": "table",
        },
      ]
    `);
  });

  it('names each mark in a real table', () => {
    const page = html(pairExample);
    expect(page).toContain('<th role="rowheader" scope="row"');
    expect(page).toContain('role="img" aria-label="Yes"');
  });
});
