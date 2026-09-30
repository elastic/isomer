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
import {
  frameBodyHeight,
  frameContentWidth,
} from '../../theme/components/frame';
import { title, titleShares } from '../../theme/components/title';
import { slideLayout } from '../layout';
import { trackWidth } from '../size';
import {
  crowdingBelow,
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';
import { headingRoom } from '../slide_heading/fit';
import { paneLayouts } from '../slide_split/pane_layout';
import type { SlideSplitNode } from '../slide_split/types';

import { example, fullExample, pairExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { matrixSize } from './react';

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
      "| | Basic | **● Plus** |
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
                          "text": "● Plus",
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
  it('checks marks only while the counts are within bounds', () => {
    const [first] = pairExample.rows;
    const rows = Array.from({ length: 100_000 }, () => first);
    expect(errorPaths({ ...pairExample, rows })).toEqual([
      'body[0].body[0].rows',
    ]);
  });

  it('marks the highlighted heading with a cue on every surface', () => {
    for (const output of everySurface(pairExample)) {
      expect(output).toContain('● Plus');
    }
    expect(html(pairExample)).toContain('role="img" aria-label="Primary"');
  });

  it('keeps the Slack table whole at the cell budget, and falls back to rich text one past it', () => {
    const [first, ...rest] = pairExample.rows;
    const withLabel = (label: string) =>
      runtime.surfaces.slack.renderNode({
        ...pairExample,
        rows: [{ ...first!, label }, ...rest],
      } as PrimitiveNode).blocks[0];
    const at = 'x'.repeat(
      SLACK_LIMITS.tableCellCharsPerMessage - tableChars(withLabel(''))
    );
    expect(tableChars(withLabel(at))).toBe(
      SLACK_LIMITS.tableCellCharsPerMessage
    );
    const over = withLabel(`${at}y`);
    expect(over?.type).toBe('rich_text');
    expect(JSON.stringify(over)).toContain(`${at}y`);
  });

  describe('size', () => {
    const rows = (count: number) =>
      Array.from({ length: count }, () => pairExample.rows[0]!);

    it.each([
      [4, 1, 'l'],
      [5, 1, 'm'],
      [6, 1, 's'],
      [5, 0.8, 'l'],
      [6, 0.8, 'm'],
    ] as const)(
      '%i rows under crowding %d take %s',
      (count, crowding, step) => {
        expect(matrixSize({ rows: rows(count) }, crowding)).toBe(step);
      }
    );

    it('keeps an authored size', () => {
      expect(matrixSize({ rows: rows(8), size: 'l' }, 1)).toBe('l');
    });

    it.each([
      ['alone', 6, undefined, slideLayout(undefined).crowding],
      [
        'under a crowding heading',
        4,
        crowdingHeading,
        crowdingBelow(crowdingHeading),
      ],
    ] as const)(
      'draws the step it counts %s',
      (_name, count, heading, crowding) => {
        const node = { ...pairExample, rows: rows(count) };
        const step = matrixSize(node, crowding);
        expect(step).not.toBe(matrixSize(node, 1));
        expect(renderedStep('matrix-cellPadding', node, heading)).toBe(step);
      }
    );

    it('draws the step it counts as a title aside', () => {
      const node = { ...pairExample, rows: rows(6) };
      const step = matrixSize(
        node,
        slideLayout({
          layout: {
            width: trackWidth(
              frameContentWidth,
              titleShares,
              title.columnGap,
              1
            ),
            height: frameBodyHeight,
          },
        }).crowding
      );
      expect(step).not.toBe(matrixSize(node, 1));
      expect(
        renderedStep('matrix-cellPadding', {
          type: 'slideTitle',
          title: 'Crate',
          aside: node,
        })
      ).toBe(step);
    });

    it('draws the step it counts in a split pane', () => {
      const node = { ...pairExample, rows: rows(4) };
      const split: SlideSplitNode = {
        type: 'slideSplit',
        panes: [
          { label: 'Plans', items: [node] },
          { items: [{ type: 'slideBulletList', items: ['One'] }] },
        ],
      };
      const [pane] = paneLayouts(
        { width: frameContentWidth, height: headingRoom(referenceHeading) },
        split
      );
      const step = matrixSize(node, slideLayout({ layout: pane }).crowding);
      expect(step).not.toBe(matrixSize(node, 1));
      expect(renderedStep('matrix-cellPadding', split, referenceHeading)).toBe(
        step
      );
    });

    it('draws the full example, six columns and eight rows, at the smallest step', () => {
      expect(fullExample.columns).toHaveLength(6);
      expect(fullExample.rows).toHaveLength(8);
      expect(matrixSize(fullExample, 1)).toBe('s');
    });
  });
});
