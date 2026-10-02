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
import {
  type Composition,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS, type SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { slideDeckFrame, slidesPack } from '../../pack';
import { bars as barsTheme } from '../../theme/components/bars';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { measureMarks, measureText } from '../size';
import { renderedStep } from '../size.fixtures';

import { denseExample, example, scaledExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { barsSize } from './react';
import type { SlideBarsNode } from './schema';
import { barValue } from './value';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
  // Room for the 100,000-bar bounds check.
  inputBudget: { values: 1_000_000, characters: 10_000_000 },
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

/** Each `rich_text_section`'s text in a degraded table. */
const sectionTexts = (block: SlackBlock | undefined): string[] => {
  if (block?.type !== 'rich_text') {
    throw new Error(`expected rich_text, got ${block?.type}`);
  }
  return block.elements.map((element) =>
    element.type === 'rich_text_section'
      ? element.elements
          .map((run) => (run.type === 'text' ? run.text : ''))
          .join('')
      : ''
  );
};

const expectWithinSectionLimit = (sections: readonly string[]) => {
  for (const section of sections) {
    expect(section.length).toBeLessThanOrEqual(SLACK_LIMITS.sectionTextChars);
  }
};

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
    expect(errorPaths({ ...example, max: 412 })).toEqual([]);
    expect(errorPaths({ ...example, max: 411.99 })).toEqual([
      'body[0].body[0].max',
    ]);
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

  it.each([NaN, Infinity, -Infinity])('rejects a value or max of %d', (n) => {
    const [first, second] = example.items;
    expect(
      errorPaths({ ...example, items: [{ ...first, value: n }, second] })
    ).toEqual(['body[0].body[0].items[0].value']);
    expect(errorPaths({ ...example, max: n })).toContain('body[0].body[0].max');
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

  describe('as drawn by takumi', () => {
    const takumi = createTakumiImageBackend({ fonts: slideFonts });
    const boxes = (box: LayoutBox): LayoutBox[] => [
      box,
      ...box.children.flatMap(boxes),
    ];
    const drawn = async (slide: Composition): Promise<LayoutBox> =>
      boxes(
        await takumi.measure(
          runtime.surfaces.svg.render(slide, { anchors: true })
        )
      ).find(
        ({ attributes }) => attributes?.[NODE_ANCHOR_ATTRIBUTE] === 'slideBars'
      )!;

    it('draws a positive bar at least its minimum width however small its share, and a zero bar not at all', async () => {
      const node: SlideBarsNode = {
        type: 'slideBars',
        max: 10_000_000,
        items: [
          { label: 'One', value: 1 },
          { label: 'None', value: 0 },
        ],
      };
      expect(html(node).match(/class="[^"]*bars-barPositive/g)).toHaveLength(1);
      const bars = boxes(await drawn(compose(node))).filter(
        ({ attributes }) => attributes?.['aria-hidden'] === 'true'
      );
      expect(bars.map(({ width }) => width)).toEqual([
        scalePx(barsTheme.barMinWidth),
        0,
      ]);
    });

    it('keeps its rows inside a split pane in a title aside', async () => {
      const root = await drawn(
        compose({
          type: 'slideTitle',
          title: 'Payments',
          aside: {
            type: 'slideSplit',
            panes: [{ items: [example] }, { items: [example] }],
          },
        })
      );
      for (const { x, width } of boxes(root)) {
        expect(x + width).toBeLessThanOrEqual(root.x + root.width + 0.5);
      }
    });
  });

  it('marks the highlighted bar with a cue that is not color alone', () => {
    expect(html(example)).toContain('role="img" aria-label="Primary"');
  });

  it('keeps the Slack table whole at the cell budget, and one past it prints as rich text sections within Slack’s section limit', () => {
    const [first, ...rest] = scaledExample.items;
    const withLabel = (label: string) =>
      runtime.surfaces.slack.renderNode(
        {
          ...scaledExample,
          items: [{ ...first!, label }, ...rest],
        } as PrimitiveNode,
        { onValidationError: 'collect' }
      ).blocks[0];
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
    const sections = sectionTexts(over);
    expect(sections.length).toBeGreaterThan(2);
    expectWithinSectionLimit(sections);
    expect(sections.join('')).toContain(`${at}y`);
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

    it('counts a wrapped label line as another bar tall', () => {
      const labelled = (label: string): SlideBarsNode => ({
        ...bars(5, 0),
        items: bars(5, 0).items.map((item) => ({ ...item, label })),
      });
      expect(barsSize(labelled('Leeds'), full)).toBe('l');
      expect(
        barsSize(labelled('Customer support tickets opened'), full)
      ).not.toBe('l');
    });

    describe('a word wider than its line', () => {
      const pair = (label: string, detail?: string): SlideBarsNode => ({
        type: 'slideBars',
        items: [2, 1].map((value) => ({
          label,
          value,
          ...(detail ? { detail } : {}),
        })),
      });
      const takumi = createTakumiImageBackend({ fonts: slideFonts });
      const runs = (box: LayoutBox): LayoutBox['runs'] => [
        ...box.runs,
        ...box.children.flatMap(runs),
      ];
      /** Lines takumi draws each item's run of `letter`s across. */
      const drawnLines = async (node: SlideBarsNode, letter: string) => {
        const drawn = runs(
          await takumi.measure(runtime.surfaces.svg.render(compose(node)))
        ).filter(({ text }) => text.startsWith(letter));
        return new Set(drawn.map(({ y }) => Math.round(y))).size / 2;
      };

      it('counts the lines an unbroken label breaks across its column', async () => {
        expect(barsSize(pair('x'.repeat(10)), full)).toBe('l');
        expect(barsSize(pair('x'.repeat(60)), full)).toBe('m');
        const { lines } = measureText(
          'x'.repeat(60),
          { ...barsTheme.label, size: barsTheme.labelSizes.m },
          scalePx(barsTheme.labelWidth)
        );
        expect(lines).toBe(4);
        expect(lines).toBeGreaterThanOrEqual(
          await drawnLines(pair('x'.repeat(60)), 'x')
        );
      });

      it('counts the lines an unbroken detail breaks across its track', async () => {
        expect(barsSize(pair('A', 'y'.repeat(90)), full)).toBe('l');
        expect(barsSize(pair('A', 'y'.repeat(400)), full)).toBe('m');
        const { lines } = measureText(
          'y'.repeat(400),
          barsTheme.detail,
          openBody.width - scalePx(barsTheme.labelWidth)
        );
        expect(lines).toBe(5);
        expect(lines).toBe(await drawnLines(pair('A', 'y'.repeat(400)), 'y'));
      });

      describe('marked runs', () => {
        const code = `\`${'i'.repeat(60)}\``;

        it('measures a code label in mono, as it is drawn', async () => {
          expect(barsSize(pair('i'.repeat(60)), full)).toBe('l');
          const step = barsSize(pair(code), full);
          expect(step).not.toBe('l');
          const { lines } = measureMarks(
            code,
            { ...barsTheme.label, size: barsTheme.labelSizes[step] },
            scalePx(barsTheme.labelWidth),
            'primary'
          );
          expect(lines).toBe(4);
          expect(lines).toBe(await drawnLines(pair(code), 'i'));
        });

        it('measures the spaces of a multiword code label in mono', async () => {
          const words = `\`${Array.from({ length: 9 }, () => 'iii').join(' ')}\``;
          const step = barsSize(pair(words), full);
          const { lines } = measureMarks(
            words,
            { ...barsTheme.label, size: barsTheme.labelSizes[step] },
            scalePx(barsTheme.labelWidth),
            'primary'
          );
          expect(lines).toBe(await drawnLines(pair(words), 'i'));
        });

        it('measures a code detail in mono with its chip, and strong in bold', () => {
          const detail = (text: string) =>
            measureMarks(text, barsTheme.detail).widest;
          expect(detail('`abc`')).toBeGreaterThan(detail('abc'));
          const regular = { size: barsTheme.detail.size };
          expect(measureMarks('**Leeds**', regular).widest).toBeGreaterThan(
            measureMarks('Leeds', regular).widest
          );
        });
      });
    });

    it('draws the dense example, six bars each with a detail, at the smallest step under crowding 1', () => {
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

  it('prints its labels and values when an earlier chart spends the message’s cell budget', () => {
    const chart = (label: string) => ({
      type: 'slideBars',
      items: [
        { label, value: 2 },
        { label: 'B', value: 1 },
      ],
    });
    const later = 'x'.repeat(5000);
    const { blocks } = runtime.surfaces.slack.render({
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: [
            chart('y'.repeat(SLACK_LIMITS.tableCellCharsPerMessage - 1000)),
            chart(later),
          ],
        } as PrimitiveNode,
      ],
    });
    expect(blocks.filter(({ type }) => type === 'table')).toHaveLength(1);
    const sections = sectionTexts(
      blocks.find(({ type }) => type === 'rich_text')
    );
    expectWithinSectionLimit(sections);
    expect(sections.join('')).toContain(later);
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
