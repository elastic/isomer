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
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { slideDeckFrame, slidesPack } from '../../pack';
import { delta as theme } from '../../theme/components/delta';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { emWidth } from '../size';
import { renderedStep } from '../size.fixtures';
import { paneWidths } from '../slide_split/pane_layout';

import { example, pendingExample, wideExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { deltaValueSize } from './react';
import type { SlideDeltaNode } from './schema';

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

describe('slideDelta', () => {
  const everySurface = (node: object): string[] => [
    runtime.surfaces.text.renderNode(node as PrimitiveNode),
    runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
    JSON.stringify(
      runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
    ),
  ];

  it.each([
    ['before.value', { ...example, before: { ...example.before, value: ' ' } }],
    ['change', { ...example, change: ' ' }],
  ])('needs a visible character in %s', (field, node) => {
    expect(errorPaths(node)).toEqual([`body[0].body[0].${field}`]);
  });

  it('states a change only between two values', () => {
    expect(errorPaths({ ...pendingExample, change: '+3' }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].change",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"OLD CHECKOUT 4.2s → NEW CHECKOUT 1.1s. −74%: Median time from Pay to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**OLD CHECKOUT** 4.2s → **NEW CHECKOUT** 1.1s. **−74%**: Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"BEFORE THE MOVE 38 → AFTER THE MOVE [value pending]. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."`
    );
  });

  it('renders Slack as one rich text line', () => {
    expect(runtime.surfaces.slack.renderNode(pendingExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "elements": [
              {
                "elements": [
                  {
                    "style": {
                      "bold": true,
                    },
                    "text": "BEFORE THE MOVE",
                    "type": "text",
                  },
                  {
                    "text": " ",
                    "type": "text",
                  },
                  {
                    "text": "38",
                    "type": "text",
                  },
                  {
                    "text": " → ",
                    "type": "text",
                  },
                  {
                    "style": {
                      "bold": true,
                    },
                    "text": "AFTER THE MOVE",
                    "type": "text",
                  },
                  {
                    "text": " ",
                    "type": "text",
                  },
                  {
                    "style": {
                      "italic": true,
                    },
                    "text": "value pending",
                    "type": "text",
                  },
                  {
                    "text": ". ",
                    "type": "text",
                  },
                  {
                    "text": "Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.",
                    "type": "text",
                  },
                ],
                "type": "rich_text_section",
              },
            ],
            "type": "rich_text",
          },
        ]
      `);
  });

  it('names the arrow for assistive technology', () => {
    expect(html(example)).toContain('role="img" aria-label="leads to"');
  });

  it('uppercases labels on every surface but keeps code in its case', () => {
    const node = {
      ...example,
      before: { ...example.before, label: 'Old `api` **path**' },
    };
    expect(text(node)).toContain('OLD api PATH 4.2s');
    expect(markdown(node)).toContain('**OLD `api` PATH**');
  });

  describe('value size', () => {
    const pair = (before: string, after = '0'): SlideDeltaNode => ({
      ...example,
      before: { label: 'Before', value: before },
      after: { label: 'After', value: after },
      body: 'Body.',
    });
    const valueWidth = (value: string, step: 'l' | 'm' | 's') =>
      emWidth(value, theme.value.tracking) * scalePx(theme.valueSizes[step]);
    /** The row a pair of values takes at `l`, up to the arrow's far gap. */
    const pairWidth = (before: string, after: string) =>
      valueWidth(before, 'l') +
      valueWidth(after, 'l') +
      scalePx(theme.arrowWidth) +
      2 * scalePx(theme.columnGap);
    const noteFloor =
      scalePx(theme.columnGap) +
      scalePx(theme.noteMinWidth) +
      scalePx(theme.notePadding) +
      scalePx(theme.rule);

    it.each([
      ['0000', 'l'],
      ['00000', 'm'],
      ['00000000', 's'],
    ] as const)('%s beside one digit takes %s', (value, step) => {
      expect(deltaValueSize(pair(value), openBody.width)).toBe(step);
    });

    it('sizes the row by both sides together, not by the wider alone', () => {
      expect(deltaValueSize(pair('0000', '0'), openBody.width)).toBe('l');
      expect(deltaValueSize(pair('0', '0000'), openBody.width)).toBe('l');
      expect(deltaValueSize(pair('000', '000'), openBody.width)).toBe('m');
    });

    it('keeps an authored size', () => {
      expect(
        deltaValueSize({ ...pair('00000'), size: 'l' }, openBody.width)
      ).toBe('l');
    });

    it('draws the wide example at the smallest step', () => {
      expect(deltaValueSize(wideExample, openBody.width)).toBe('s');
    });

    it('holds the note’s measure, padding, and rule beside the pair, to the pixel', () => {
      const row = pairWidth('000', '00') + noteFloor;
      expect(deltaValueSize(pair('000', '00'), row + 0.5)).toBe('l');
      expect(deltaValueSize(pair('000', '00'), row - 0.5)).toBe('m');
    });

    it('wraps the note under the pair when no step holds it beside them', () => {
      const alone = pairWidth('000', '00');
      expect(deltaValueSize(pair('000', '00'), alone + 0.5)).toBe('l');
      expect(deltaValueSize(pair('000', '00'), alone - 0.5)).toBe('m');
    });

    it('measures a label wider than its value, and a placeholder for a missing value', () => {
      const long = 'Before the warehouse moved';
      expect(
        deltaValueSize(
          { ...pair('0'), before: { label: long, value: '0' } },
          openBody.width
        )
      ).toBe(deltaValueSize(pair('0'), openBody.width));
      expect(
        deltaValueSize(
          { ...pair('0'), before: { label: long.repeat(4), value: '0' } },
          openBody.width
        )
      ).toBe('s');
      expect(
        deltaValueSize({ ...pair('0'), before: { label: 'Before' } }, 400)
      ).toBe('s');
    });

    it('measures its values across a split pane and a title aside', () => {
      const node = pair('000');
      const [pane] = paneWidths(openBody.width, 'even', 'gap');
      const bullets = { type: 'slideBulletList', items: ['One'] };
      expect(renderedStep('delta-valueSize', node)).toBe('l');
      expect(deltaValueSize(node, pane)).not.toBe('l');
      expect(
        renderedStep('delta-valueSize', {
          type: 'slideSplit',
          panes: [{ items: [node] }, { items: [bullets] }],
        })
      ).toBe(deltaValueSize(node, pane));
      expect(
        renderedStep('delta-valueSize', {
          type: 'slideTitle',
          title: 'Payments',
          aside: node,
        })
      ).not.toBe('l');
    });

    describe('drawn by takumi', () => {
      const takumi = createTakumiImageBackend({ fonts: slideFonts });
      const runs = (box: LayoutBox): LayoutBox['runs'] => [
        ...box.runs,
        ...box.children.flatMap(runs),
      ];
      /** The second value and the note's body, as drawn. */
      const drawn = async (node: SlideDeltaNode) => {
        const all = runs(
          await takumi.measure(runtime.surfaces.svg.render(compose(node)))
        );
        const run = (text: string | undefined) =>
          all.find((candidate) => candidate.text.trim() === text)!;
        return { value: run(node.after.value), body: run(node.body) };
      };

      it.each([
        ['a four-digit value beside one digit, at l', pair('0000', '0'), 'l'],
        ['four digits and three, at m', pair('0000', '000'), 'm'],
      ] as const)('keeps the note beside %s', async (_name, node, step) => {
        expect(deltaValueSize(node, openBody.width)).toBe(step);
        const { value, body } = await drawn(node);
        expect(body.x).toBeGreaterThan(value.x + value.width);
        expect(body.y).toBeLessThan(value.y + value.height);
      });

      it('wraps the note under four digits and three at l, the step it passes over', async () => {
        const { value, body } = await drawn({
          ...pair('0000', '000'),
          size: 'l',
        });
        expect(body.y).toBeGreaterThan(value.y + value.height);
      });
    });
  });
  it('prints the pending caption on every surface', () => {
    for (const output of everySurface(pendingExample)) {
      expect(output).toContain('value pending');
    }
  });
});
