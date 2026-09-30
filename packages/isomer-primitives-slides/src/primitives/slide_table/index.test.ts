/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS, type SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { slideDeckFrame, slidesPack } from '../../pack';
import {
  frameBodyHeight,
  frameContentWidth,
} from '../../theme/components/frame';
import { label as labelTheme } from '../../theme/components/shared';
import { table } from '../../theme/components/table';
import { title, titleShares } from '../../theme/components/title';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { trackWidth } from '../size';
import {
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';
import { headingRoom, referenceRoom } from '../slide_heading/fit';
import { paneLayouts } from '../slide_split/pane_layout';
import type { SlideSplitNode } from '../slide_split/types';

import { example, fullExample, groupsExample, plainExample } from './examples';
import { tableHeight, tableSize } from './fit';
import { markdown as markdownContent, text } from './index';
import type { SlideTableNode } from './schema';

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

/** Each `rich_text` element's text, which Slack caps at `sectionTextChars`. */
const richTextElements = (blocks: readonly SlackBlock[]): string[] =>
  blocks.flatMap((block) =>
    block.type === 'rich_text'
      ? block.elements.map((element) =>
          element.type === 'rich_text_list'
            ? ''
            : element.elements
                .map((run) => (run.type === 'text' ? run.text : ''))
                .join('')
        )
      : []
  );

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
    ).toEqual(['body[0].body[0].groups[0].rows']);
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

  it('keeps the Slack table whole at the cell budget, and splits its rich text fallback one past it', () => {
    const [[, ...rest] = [], ...rows] = plainExample.rows ?? [];
    const withCell = (cell: string) =>
      runtime.surfaces.slack.renderNode({
        ...plainExample,
        rows: [[cell, ...rest], ...rows],
      } as PrimitiveNode).blocks;
    const at = 'x'.repeat(
      SLACK_LIMITS.tableCellCharsPerMessage - tableChars(withCell('')[0])
    );
    expect(tableChars(withCell(at)[0])).toBe(
      SLACK_LIMITS.tableCellCharsPerMessage
    );
    const over = withCell(`${at}y`);
    expect(over.map(({ type }) => type)).toEqual(['rich_text']);
    const elements = richTextElements(over);
    expect(
      Math.max(...elements.map(({ length }) => length))
    ).toBeLessThanOrEqual(SLACK_LIMITS.sectionTextChars);
    expect(elements.join('')).toContain(`${at}y`);
  });

  it.each(['*', '_', '~', '`'])(
    'prints a caption holding %s as literal rich text, not mrkdwn',
    (delimiter) => {
      const label = `p${delimiter}95 ${delimiter}latency${delimiter}`;
      const node: SlideTableNode = { ...example, label };
      const [caption] = runtime.surfaces.slack.renderNode(node).blocks;
      expect(caption).toEqual({
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: label.toUpperCase(),
                style: { bold: true },
              },
            ],
          },
        ],
      });
    }
  );

  it('prints a caption with no delimiter as a mrkdwn context', () => {
    const node: SlideTableNode = { ...example, label: 'p95 latency' };
    const [caption] = runtime.surfaces.slack.renderNode(node).blocks;
    expect(caption?.type).toBe('context');
  });

  it('prints its cells, split to the Slack section limit, when an earlier table spends the message’s cell budget', () => {
    const table = (cell: string) => ({
      type: 'slideTable',
      columns: ['Region'],
      rows: [[cell]],
    });
    const later = 'x'.repeat(SLACK_LIMITS.sectionTextChars + 2000);
    const { blocks } = runtime.surfaces.slack.render({
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: [
            table(
              'y'.repeat(
                SLACK_LIMITS.tableCellCharsPerMessage - 'Region'.length
              )
            ),
            table(later),
          ],
        } as PrimitiveNode,
      ],
    });
    expect(blocks.filter(({ type }) => type === 'table')).toHaveLength(1);
    const elements = richTextElements(blocks);
    expect(elements.length).toBeGreaterThan(1);
    expect(
      Math.max(...elements.map(({ length }) => length))
    ).toBeLessThanOrEqual(SLACK_LIMITS.sectionTextChars);
    expect(elements.join('')).toContain(later);
  });

  it('sets its caption at the line height the estimate charges', () => {
    const { css } = runtime.surfaces.html.render(compose(example));
    const [rule] = /\.table-caption\{[^}]*\}/.exec(css) ?? [];
    expect(rule).toContain(`line-height:${table.labelLineHeight.value}`);
  });

  describe('drawn by takumi', () => {
    const takumi = createTakumiImageBackend({ fonts: slideFonts });
    const find = (
      box: LayoutBox,
      matches: (box: LayoutBox) => boolean
    ): LayoutBox | undefined =>
      matches(box)
        ? box
        : box.children.map((child) => find(child, matches)).find(Boolean);
    const runs = (box: LayoutBox): LayoutBox['runs'] => [
      ...box.runs,
      ...box.children.flatMap(runs),
    ];
    const drawn = async (node: SlideTableNode) => {
      const layout = await takumi.measure(
        runtime.surfaces.svg.render(compose(node))
      );
      return find(layout, ({ attributes }) => attributes?.role === 'table');
    };
    const label =
      'Checkout by region over the last twenty four hours, every market we run in, refunds and chargebacks included, measured at the edge';

    it('draws a wrapped caption’s lines as far apart as estimated', async () => {
      const box = await drawn({ ...example, label });
      const lines = [
        ...new Set(
          runs(box!)
            .filter(({ text }) => /CHECKOUT|CHARGEBACKS/.test(text))
            .map(({ y }) => y)
        ),
      ];
      expect(lines).toHaveLength(2);
      expect(lines[1]! - lines[0]!).toBeCloseTo(
        scalePx(labelTheme.size) * parseFloat(table.labelLineHeight.value),
        0
      );
    });

    // Takumi snaps each row to whole pixels, so the two differ by a pixel or so.
    it.each(['l', 'm', 's'] as const)(
      'is as tall at %s as estimated, with a wrapped caption and group labels',
      async (size) => {
        const node: SlideTableNode = { ...groupsExample, label, size };
        const box = await drawn(node);
        expect(
          Math.abs(box!.height - tableHeight(node, size, frameContentWidth))
        ).toBeLessThan(2);
      }
    );
  });

  describe('size', () => {
    const [, typical = []] = example.rows ?? [];
    const rows = (count: number, cells = typical): SlideTableNode => ({
      ...example,
      rows: Array.from({ length: count }, () => [...cells]),
    });
    const reference = { width: frameContentWidth, height: referenceRoom };

    it.each([
      [5, 'reference', reference, 'l'],
      [6, 'reference', reference, 'm'],
      [7, 'reference', reference, 's'],
      [9, 'open', openBody, 'l'],
      [10, 'open', openBody, 'm'],
    ] as const)(
      '%i rows in the %s layout take %s',
      (count, _name, layout, step) => {
        expect(tableSize(rows(count), layout)).toBe(step);
      }
    );

    it('counts the lines a long cell wraps to', () => {
      const long = [
        'North America',
        'Every order placed through the new checkout, refunds included',
        '380 ms',
        '0.1%',
      ];
      expect(tableSize(rows(4), reference)).toBe('l');
      expect(tableSize(rows(4, long), reference)).toBe('s');
    });

    it('measures its cells across the layout width', () => {
      expect(tableSize(rows(4), reference)).toBe('l');
      expect(
        tableSize(rows(4), { ...reference, width: frameContentWidth / 2 })
      ).toBe('s');
      expect(tableSize(rows(1), { ...openBody, width: 0 })).toBe('s');
    });

    it('counts the lines a group label wraps to across the table', () => {
      const [first, second] = groupsExample.groups ?? [];
      const withLabel = (label: string): SlideTableNode => ({
        ...groupsExample,
        groups: [{ ...first!, label }, second!],
      });
      const short = withLabel('Every order');
      const long = withLabel(
        'Every order placed through the new checkout across every region we run in'
      );
      const width = frameContentWidth / 2;
      const layout = { width, height: tableHeight(short, 'l', width) };
      expect(tableSize(short, layout)).toBe('l');
      expect(tableHeight(long, 'l', width)).toBeGreaterThan(layout.height);
      expect(tableSize(long, layout)).not.toBe('l');
    });

    it('counts the lines a heading wraps to in its column', () => {
      const withHeading = (heading: string): SlideTableNode => ({
        ...example,
        columns: [heading, 'Orders', 'p99', 'Errors'],
      });
      const short = withHeading('Region');
      const long = withHeading('Region shipped');
      const width = frameContentWidth / 2;
      const layout = { width, height: tableHeight(short, 'l', width) };
      expect(tableSize(short, layout)).toBe('l');
      expect(tableHeight(long, 'l', width) - layout.height).toBeCloseTo(
        scalePx(table.head.size) * parseFloat(table.head.lineHeight.value)
      );
      expect(tableSize(long, layout)).not.toBe('l');
    });

    it('counts the lines a caption wraps to across the table', () => {
      const short: SlideTableNode = { ...example, label: 'Checkout' };
      const long: SlideTableNode = {
        ...example,
        label:
          'Checkout by region over the last day, refunds and chargebacks included',
      };
      const width = frameContentWidth / 2;
      const layout = { width, height: tableHeight(short, 'l', width) };
      expect(tableSize(short, layout)).toBe('l');
      expect(tableHeight(long, 'l', width) - layout.height).toBeCloseTo(
        scalePx(labelTheme.size) * parseFloat(table.labelLineHeight.value)
      );
      expect(tableSize(long, layout)).not.toBe('l');
    });

    it.each([
      ['caption', (word: string) => ({ ...groupsExample, label: word })],
      [
        'heading',
        (word: string) => ({ ...groupsExample, columns: [word, 'Role', 'On'] }),
      ],
      [
        'group label',
        (word: string) => ({
          ...groupsExample,
          groups: groupsExample.groups?.map((group, index) =>
            index === 0 ? { ...group, label: word } : group
          ),
        }),
      ],
      [
        'cell',
        (word: string) => ({
          ...groupsExample,
          groups: groupsExample.groups?.map((group, index) =>
            index === 0 ? { ...group, rows: [[word, 'Role', 'On']] } : group
          ),
        }),
      ],
    ] as const)(
      'counts the lines an unbroken %s breaks across',
      (_name, withWord) => {
        const height = (length: number) =>
          tableHeight(withWord('x'.repeat(length)), 'l', frameContentWidth);
        expect(height(400)).toBeGreaterThan(height(200));
        expect(height(200)).toBeGreaterThan(height(4));
      }
    );

    it('measures a row header in its bold face', () => {
      const node = (rowHeaders: boolean): SlideTableNode => ({
        type: 'slideTable',
        columns: ['Name'],
        rowHeaders,
        rows: [['WWWW MMMM']],
      });
      expect(tableHeight(node(true), 'l', 247)).toBeGreaterThan(
        tableHeight(node(false), 'l', 247)
      );
    });

    it('keeps an authored size', () => {
      expect(tableSize({ ...rows(12), size: 'l' }, reference)).toBe('l');
    });

    it('draws the full example, twelve rows, at the smallest step under a heading', () => {
      expect(fullExample.rows).toHaveLength(12);
      expect(tableSize(fullExample, reference)).toBe('s');
    });

    it.each([
      ['alone', rows(10), undefined, openBody],
      [
        'under a crowding heading',
        rows(4),
        crowdingHeading,
        { width: frameContentWidth, height: headingRoom(crowdingHeading) },
      ],
    ] as const)(
      'draws the step it measures %s',
      (_name, node, heading, layout) => {
        expect(renderedStep('table-headStep', node, heading)).toBe(
          tableSize(node, layout)
        );
      }
    );

    it('draws the step it measures as a title aside', () => {
      const node = rows(9);
      const step = tableSize(node, {
        width: trackWidth(frameContentWidth, titleShares, title.columnGap, 1),
        height: frameBodyHeight,
      });
      expect(step).not.toBe(tableSize(node, openBody));
      expect(
        renderedStep('table-headStep', {
          type: 'slideTitle',
          title: 'Crate',
          aside: node,
        })
      ).toBe(step);
    });

    it('draws the step it measures in a split pane', () => {
      const node = rows(5);
      const split: SlideSplitNode = {
        type: 'slideSplit',
        panes: [
          { label: 'Regions', items: [node] },
          { items: [{ type: 'slideBulletList', items: ['One'] }] },
        ],
      };
      const [pane] = paneLayouts(
        { width: frameContentWidth, height: headingRoom(referenceHeading) },
        split
      );
      const step = tableSize(node, pane);
      expect(step).not.toBe(tableSize(node, reference));
      expect(renderedStep('table-headStep', split, referenceHeading)).toBe(
        step
      );
    });
  });
});
