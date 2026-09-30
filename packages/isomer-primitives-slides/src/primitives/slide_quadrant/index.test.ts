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
  frameBodyHeight,
  frameContentWidth,
} from '../../theme/components/frame';
import { title, titleShares } from '../../theme/components/title';
import { slideLayout } from '../layout';
import { trackWidth } from '../size';
import {
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';
import { headingRoom } from '../slide_heading/fit';
import { paneLayouts } from '../slide_split/pane_layout';
import type { SlideSplitNode } from '../slide_split/types';

import { example, fullExample, menuExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { quadrantSize } from './react';
import type { SlideQuadrantNode } from './schema';

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

const everySurface = (node: object): string[] => [
  runtime.surfaces.text.renderNode(node as PrimitiveNode),
  runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
  JSON.stringify(
    runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
  ),
];

describe('slideQuadrant', () => {
  it('holds exactly four quadrants of four items at most', () => {
    expect(errorPaths({ ...example, quadrants: example.quadrants.slice(1) }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].quadrants",
      ]
    `);
    expect(
      errorPaths({
        ...example,
        quadrants: [
          { label: 'Full', items: ['a', 'b', 'c', 'd', 'e'] },
          ...example.quadrants.slice(1),
        ],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].quadrants[0].items",
      ]
    `);
  });

  it('places each quadrant by its axis ends in text and markdown', () => {
    expect(text(menuExample)).toMatchInlineSnapshot(`
      "y: SLOW → POPULAR · x: THIN MARGIN → RICH MARGIN
      ● Plowhorses (Popular, Thin margin): drip, bagel, muffin, tea
      Stars (Popular, Rich margin): latte, cold brew
      Dogs (Slow, Thin margin)
      Puzzles (Slow, Rich margin): matcha, affogato, cortado"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "y: MINOR → MAJOR · x: EASY → HARD

      - **Quick wins** (Major, Easy): dark mode, saved carts
      - **Big bets** (Major, Hard): same-day
      - **Fill-ins** (Minor, Easy): new icons, sitemap
      - **Money pits** (Minor, Hard): own fleet"
    `);
  });

  it('renders Slack as the axes, then a field per quadrant', () => {
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "elements": [
              {
                "text": "y: MINOR → MAJOR · x: EASY → HARD",
                "type": "mrkdwn",
              },
            ],
            "type": "context",
          },
          {
            "fields": [
              {
                "text": "*Quick wins* (Major, Easy): dark mode, saved carts",
                "type": "mrkdwn",
              },
              {
                "text": "*Big bets* (Major, Hard): same-day",
                "type": "mrkdwn",
              },
              {
                "text": "*Fill-ins* (Minor, Easy): new icons, sitemap",
                "type": "mrkdwn",
              },
              {
                "text": "*Money pits* (Minor, Hard): own fleet",
                "type": "mrkdwn",
              },
            ],
            "type": "section",
          },
        ]
      `);
  });

  it('names each cell by its axis ends', () => {
    expect(html(example)).toContain('role="group" aria-label="Major, Easy"');
  });
  it('marks the highlighted quadrant with a cue on every surface', () => {
    for (const output of everySurface(menuExample)) {
      expect(output).toContain('● Plowhorses');
    }
    expect(html(menuExample)).toContain('role="img" aria-label="Primary"');
  });

  describe('size', () => {
    const cells = (top: number, bottom: number): SlideQuadrantNode => ({
      ...example,
      quadrants: [top, 0, bottom, 0].map((count, index) => ({
        label: `Cell ${index}`,
        items: Array.from({ length: count }, () => 'item'),
      })),
    });

    it.each([
      [2, 2, 1, 'l'],
      [3, 2, 1, 'm'],
      [3, 3, 1, 'm'],
      [4, 3, 1, 's'],
      [3, 2, 0.8, 'l'],
      [4, 3, 0.8, 'm'],
    ] as const)(
      '%i top and %i bottom items under crowding %d take %s',
      (top, bottom, crowding, step) => {
        expect(
          quadrantSize(cells(top, bottom), {
            width: frameContentWidth,
            crowding,
          })
        ).toBe(step);
      }
    );

    it('scales its count by how much narrower than the frame body its layout is', () => {
      const node = cells(2, 1);
      expect(
        quadrantSize(node, { width: frameContentWidth, crowding: 1 })
      ).toBe('l');
      expect(
        quadrantSize(node, { width: frameContentWidth / 2, crowding: 1 })
      ).toBe('m');
      expect(quadrantSize(node, { width: 0, crowding: 1 })).toBe('s');
    });

    it('keeps an authored size', () => {
      expect(
        quadrantSize(
          { ...cells(4, 4), size: 'l' },
          { width: frameContentWidth, crowding: 1 }
        )
      ).toBe('l');
    });

    it.each([
      ['alone', cells(3, 3), undefined, slideLayout(undefined)],
      [
        'under a crowding heading',
        cells(2, 2),
        crowdingHeading,
        slideLayout({
          layout: {
            width: frameContentWidth,
            height: headingRoom(crowdingHeading),
          },
        }),
      ],
    ] as const)(
      'draws the step it counts %s',
      (_name, node, heading, layout) => {
        const step = quadrantSize(node, layout);
        expect(step).not.toBe(
          quadrantSize(node, { width: frameContentWidth, crowding: 1 })
        );
        expect(renderedStep('quadrant-cellSize', node, heading)).toBe(step);
      }
    );

    it('draws the step it counts in a split pane', () => {
      const node = cells(2, 1);
      const split: SlideSplitNode = {
        type: 'slideSplit',
        panes: [
          { label: 'Features', items: [node] },
          { items: [{ type: 'slideBulletList', items: ['One'] }] },
        ],
      };
      const [pane] = paneLayouts(
        { width: frameContentWidth, height: headingRoom(referenceHeading) },
        split
      );
      const step = quadrantSize(node, slideLayout({ layout: pane }));
      expect(step).not.toBe('l');
      expect(renderedStep('quadrant-cellSize', split, referenceHeading)).toBe(
        step
      );
    });

    it('draws the step it counts as a title aside', () => {
      const node = cells(2, 1);
      const step = quadrantSize(
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
        })
      );
      expect(step).not.toBe('l');
      expect(
        renderedStep('quadrant-cellSize', {
          type: 'slideTitle',
          title: 'Crate',
          aside: node,
        })
      ).toBe(step);
    });

    it('draws the full example, four items in every cell, at the smallest step', () => {
      expect(
        fullExample.quadrants.every(({ items }) => items.length === 4)
      ).toBe(true);
      expect(
        quadrantSize(fullExample, { width: frameContentWidth, crowding: 1 })
      ).toBe('s');
    });
  });
});
