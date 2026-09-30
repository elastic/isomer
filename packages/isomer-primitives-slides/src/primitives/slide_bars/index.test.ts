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
import { bars as barsTheme } from '../../theme/components/bars';
import { openBody } from '../layout';
import { renderedStep } from '../size.fixtures';

import { denseExample, example, scaledExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { barsSize } from './react';
import type { SlideBarsNode } from './schema';
import { barValue } from './value';

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
  const everySurface = (node: object): string[] => [
    runtime.surfaces.text.renderNode(node as PrimitiveNode),
    runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
    JSON.stringify(
      runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
    ),
  ];

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
      "Label      Value  Detail
      ---------  -----  ----------------------
      Leeds      412    orders packed per hour
      ● Bristol  356    orders packed per hour
      Glasgow    298    orders packed per hour
      Cardiff    214    orders packed per hour
      Belfast    130    opened in March"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "| Label | Value | Detail |
      | - | - | - |
      | Leeds | 412 | orders packed per hour |
      | **● Bristol** | **356** | **orders packed per hour** |
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
      | **● Reviews** | **63** |
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
                          "text": "● Reviews",
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

  it('checks highlight and max once past the bar limit only by the limit', () => {
    const items = Array.from({ length: 100_000 }, () => ({
      label: 'x',
      value: 2,
      highlight: true,
    }));
    expect(errorPaths({ ...example, items, max: 1 })).toEqual([
      'body[0].body[0].items',
    ]);
  });

  it('marks the highlighted bar with a cue that is not color alone', () => {
    expect(html(example)).toContain('role="img" aria-label="Primary"');
  });

  it('keeps the Slack table whole at the cell budget, and falls back to rich text one past it', () => {
    const [first, ...rest] = scaledExample.items;
    const withLabel = (label: string) =>
      runtime.surfaces.slack.renderNode({
        ...scaledExample,
        items: [{ ...first!, label }, ...rest],
      } as PrimitiveNode).blocks[0];
    const cells = (block: SlackBlock | undefined): number =>
      block?.type === 'table'
        ? block.rows
            .flat()
            .map((cell) =>
              cell.type === 'raw_text'
                ? cell.text
                : cell.elements
                    .flatMap((element) =>
                      element.type === 'rich_text_section'
                        ? element.elements
                        : []
                    )
                    .map((run) => (run.type === 'text' ? run.text : ''))
                    .join('')
            )
            .join('').length
        : Number.NaN;
    const spent = cells(withLabel(''));
    const at = 'x'.repeat(SLACK_LIMITS.tableCellCharsPerMessage - spent);
    expect(withLabel(at)?.type).toBe('table');
    const over = withLabel(`${at}y`);
    expect(over?.type).toBe('rich_text');
    expect(JSON.stringify(over)).toContain(`${at}y`);
  });

  describe('size', () => {
    const bars = (count: number, details: number): SlideBarsNode => ({
      type: 'slideBars',
      items: Array.from({ length: count }, (_, index) => ({
        label: 'Label',
        value: index + 1,
        ...(index < details ? { detail: 'detail' } : {}),
      })),
    });

    it.each([
      [5, 3, 1, 'l'],
      [5, 4, 1, 'm'],
      [6, 4, 1, 'm'],
      [6, 5, 1, 's'],
      [6, 4, 0.8, 'l'],
      [6, 6, 0.8, 'm'],
    ] as const)(
      '%i bars with %i details under crowding %d take %s',
      (count, details, crowding, step) => {
        expect(
          barsSize(bars(count, details), { width: openBody.width, crowding })
        ).toBe(step);
      }
    );

    const full = { width: openBody.width, crowding: 1 };

    it('fits each value beside its bar across the layout width', () => {
      const pair = (value: number, max?: number): SlideBarsNode => ({
        type: 'slideBars',
        ...(max === undefined ? {} : { max }),
        items: [
          { label: 'A', value },
          { label: 'B', value: 1 },
        ],
      });
      expect(barsSize(pair(123456), full)).toBe('l');
      expect(barsSize(pair(1234567), full)).toBe('m');
      expect(barsSize(pair(12345678), full)).toBe('s');
      expect(barsSize(pair(12345678, 100000000), full)).toBe('l');
      expect(barsSize(pair(123456), { ...full, width: 1200 })).toBe('s');
    });

    it('takes a smaller step as a title aside', () => {
      expect(renderedStep('bars-labelSize', example)).toBe('l');
      expect(
        renderedStep('bars-labelSize', {
          type: 'slideTitle',
          title: 'Payments',
          aside: example,
        })
      ).not.toBe('l');
    });

    it('keeps an authored size', () => {
      expect(barsSize({ ...bars(6, 6), size: 'l' }, full)).toBe('l');
    });

    it('draws the dense example, six bars each with a detail, at the smallest step', () => {
      expect(denseExample.items).toHaveLength(6);
      expect(denseExample.items.every(({ detail }) => detail)).toBe(true);
      expect(barsSize(denseExample, full)).toBe('s');
    });
  });
  it.each([
    [0, '0'],
    [-0, '0'],
    [0.004, '<0.01'],
    [0.00499, '<0.01'],
    [0.005, '0.01'],
    [0.01, '0.01'],
    [1.004, '1'],
    [1e21, '1000000000000000000000'],
  ])('prints %d as %s', (value, shown) => {
    expect(barValue(value)).toBe(shown);
  });

  it('keeps a chart past the message-wide cell budget whole and literal', () => {
    const half = SLACK_LIMITS.tableCellCharsPerMessage / 2;
    const chart = (label: string) => ({
      type: 'slideBars',
      items: [
        { label, value: 2 },
        { label: 'B', value: 1 },
      ],
    });
    const long = `*${'x'.repeat(half)}_`;
    const { blocks } = runtime.surfaces.slack.render({
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: [chart('y'.repeat(half)), chart(long)],
        } as PrimitiveNode,
      ],
    });
    expect(blocks.filter(({ type }) => type === 'table')).toHaveLength(1);
    const heading = (text: string) => ({
      type: 'text',
      text,
      style: { bold: true },
    });
    const cell = (label: string, value: string) => [
      heading(barsTheme.heads.label.value),
      { type: 'text', text: ': ' },
      { type: 'text', text: label },
      { type: 'text', text: '\n' },
      heading(barsTheme.heads.value.value),
      { type: 'text', text: ': ' },
      { type: 'text', text: value },
    ];
    expect(blocks).toContainEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            ...cell(long, '2'),
            { type: 'text', text: '\n' },
            { type: 'text', text: '\n' },
            ...cell('B', '1'),
          ],
        },
      ],
    });
  });

  it('never prints a positive value as zero on any surface', () => {
    const node: SlideBarsNode = {
      type: 'slideBars',
      items: [
        { label: 'Tiny', value: 0.004 },
        { label: 'None', value: 0 },
      ],
    };
    expect(html(node)).toContain('>&lt;0.01</span>');
    for (const output of everySurface(node)) {
      expect(output).toMatch(/<0\.01|&lt;0\.01/);
    }
  });

  it('prints every value and the highlight cue on every surface', () => {
    for (const output of everySurface(example)) {
      expect(output).toContain('● Bristol');
      for (const { value } of example.items) {
        expect(output).toContain(String(value));
      }
    }
  });
});
