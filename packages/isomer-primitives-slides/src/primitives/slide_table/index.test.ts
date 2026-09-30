/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS, type SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, groupsExample, plainExample } from './examples';
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

/** Characters across every cell of a `table` block, as Slack counts them. */
const tableChars = (block: SlackBlock | undefined): number =>
  block?.type === 'table'
    ? block.rows
        .flat()
        .map((cell) =>
          cell.type === 'raw_text'
            ? cell.text
            : cell.elements
                .flatMap((element) =>
                  element.type === 'rich_text_section' ? element.elements : []
                )
                .map((run) => (run.type === 'text' ? run.text : ''))
                .join('')
        )
        .join('').length
    : Number.NaN;

const everySurface = (node: object): string[] => [
  runtime.surfaces.text.renderNode(node as PrimitiveNode),
  runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
  JSON.stringify(
    runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
  ),
];

describe('slideTable', () => {
  it('takes rows or groups of twelve rows at most, one cell per column', () => {
    const { rows = [] } = example;
    expect(errorPaths({ ...example, groups: [{ label: 'All', rows }] }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].groups",
      ]
    `);
    expect(errorPaths({ ...example, rows: [...rows, ['Africa', '1']] }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].rows[3]",
      ]
    `);
    expect(
      errorPaths({
        ...groupsExample,
        groups: groupsExample.groups?.map((group) => ({
          ...group,
          rows: Array(7).fill(group.rows[0]),
        })),
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].groups",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(groupsExample)).toMatchInlineSnapshot(`
      "SERVICE        ROLE                 ON CALL
      -------------  -------------------  ----------------
      EVERY ORDER
      cart-api       Holds the basket     Payments
      ledger         Records the charge   Finance platform
      ONLY ON REFUNDS
      refund-worker  Reverses the charge  Payments
      notifier       Emails the customer  Growth"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "**CHECKOUT, LAST 24 HOURS**

      | REGION | ORDERS | P99 LATENCY | ERRORS |
      | - | - | - | - |
      | **Europe** | 48,210 | 410 ms | 0.2% |
      | **North America** | 61,905 | 380 ms | 0.1% |
      | **Asia Pacific** | 22,764 | 1.9 s | 2.4% |"
    `);
    expect(markdown(groupsExample)).toMatchInlineSnapshot(`
      "**EVERY ORDER**

      | SERVICE | ROLE | ON CALL |
      | - | - | - |
      | **cart-api** | Holds the basket | Payments |
      | **ledger** | Records the charge | Finance platform |

      **ONLY ON REFUNDS**

      | SERVICE | ROLE | ON CALL |
      | - | - | - |
      | **refund-worker** | Reverses the charge | Payments |
      | **notifier** | Emails the customer | Growth |"
    `);
  });

  it('renders Slack as one table, each group opening with a bold row', () => {
    expect(runtime.surfaces.slack.renderNode(groupsExample).blocks)
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
                  "text": "SERVICE",
                  "type": "raw_text",
                },
                {
                  "text": "ROLE",
                  "type": "raw_text",
                },
                {
                  "text": "ON CALL",
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
                          "text": "EVERY ORDER",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "",
                  "type": "raw_text",
                },
                {
                  "text": "",
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
                          "text": "cart-api",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "Holds the basket",
                  "type": "raw_text",
                },
                {
                  "text": "Payments",
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
                          "text": "ledger",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "Records the charge",
                  "type": "raw_text",
                },
                {
                  "text": "Finance platform",
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
                          "text": "ONLY ON REFUNDS",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "",
                  "type": "raw_text",
                },
                {
                  "text": "",
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
                          "text": "refund-worker",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "Reverses the charge",
                  "type": "raw_text",
                },
                {
                  "text": "Payments",
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
                          "text": "notifier",
                          "type": "text",
                        },
                      ],
                      "type": "rich_text_section",
                    },
                  ],
                  "type": "rich_text",
                },
                {
                  "text": "Emails the customer",
                  "type": "raw_text",
                },
                {
                  "text": "Growth",
                  "type": "raw_text",
                },
              ],
            ],
            "type": "table",
          },
        ]
      `);
  });

  it('renders a real table with column and row headers', () => {
    const page = html(example);
    expect(page).toContain('<caption');
    expect(page).toContain('<th role="columnheader" scope="col"');
    expect(page).toContain('<th role="rowheader" scope="row"');
  });
  it('checks cells only while the row counts are within bounds', () => {
    const rows = Array.from({ length: 100_000 }, () => ['x']);
    expect(errorPaths({ ...example, rows })).toEqual(['body[0].body[0].rows']);
    expect(
      errorPaths({
        ...example,
        rows: undefined,
        groups: [{ label: 'All', rows }],
      })
    ).toEqual(['body[0].body[0].groups']);
  });

  it('prints headings and labels uppercase on every surface, as drawn', () => {
    for (const output of everySurface(example)) {
      expect(output).toContain('P99 LATENCY');
      expect(output).toContain('CHECKOUT, LAST 24 HOURS');
    }
    for (const output of everySurface(groupsExample)) {
      expect(output).toContain('ONLY ON REFUNDS');
    }
  });

  it('keeps the Slack table whole at the cell budget, and falls back to rich text one past it', () => {
    const [[, ...rest] = [], ...rows] = plainExample.rows ?? [];
    const withCell = (cell: string) =>
      runtime.surfaces.slack.renderNode({
        ...plainExample,
        rows: [[cell, ...rest], ...rows],
      } as PrimitiveNode).blocks[0];
    const at = 'x'.repeat(
      SLACK_LIMITS.tableCellCharsPerMessage - tableChars(withCell(''))
    );
    expect(tableChars(withCell(at))).toBe(
      SLACK_LIMITS.tableCellCharsPerMessage
    );
    const over = withCell(`${at}y`);
    expect(over?.type).toBe('rich_text');
    expect(JSON.stringify(over)).toContain(`${at}y`);
  });
});
