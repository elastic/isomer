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
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { findings, slideOf } from '../../examples/measure';
import { slideDeckFrame, slidesPack } from '../../pack';
import {
  frameBodyHeight,
  frameContentWidth,
} from '../../theme/components/frame';
import { quote as quoteTheme, quoteFit } from '../../theme/components/quote';
import { split } from '../../theme/components/split';
import { statement, statementFit } from '../../theme/components/statement';
import { scalePx } from '../../theme/scale';
import { slideSplitDividers, slideSplitRatios } from '../../theme/variants';
import { openBody, slideLayout } from '../layout';
import { lineBox, narrowing, sizeForLoad } from '../size';
import { renderedStep } from '../size.fixtures';
import { fullExample as fullLayers } from '../slide_layers/examples';

import { paneLayouts, paneWidths } from './pane_layout';
import type { SlideSplitNode } from './types';

const middle = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

describe('paneWidths', () => {
  it.each(
    slideSplitRatios.flatMap((ratio) =>
      slideSplitDividers.map((divider) => [ratio, divider] as const)
    )
  )('fills the row for %s with a %s divider', (ratio, divider) => {
    const [left, right] = paneWidths(frameContentWidth, ratio, divider);
    expect(
      left + right + 2 * scalePx(split.dividerGap[divider]) + middle[divider]
    ).toBeCloseTo(frameContentWidth);
  });

  it('never gives a pane more than the split has, nor less than nothing', () => {
    for (const total of [0, 300, 700]) {
      for (const ratio of slideSplitRatios) {
        for (const divider of slideSplitDividers) {
          const widths = paneWidths(total, ratio, divider);
          for (const width of widths) {
            expect(width).toBeGreaterThanOrEqual(0);
          }
          expect(widths[0] + widths[1]).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it('gives an aside its fixed width', () => {
    expect(paneWidths(frameContentWidth, 'aside', 'gap')[1]).toBe(
      scalePx(split.ratio.aside.right)
    );
  });

  it('leaves a pane that nested splits squeeze out at zero, and its content at the smallest step', () => {
    const widths = [frameContentWidth];
    for (let depth = 0; depth < 3; depth += 1) {
      widths.push(paneWidths(widths.at(-1)!, 'aside', 'hairline')[0]);
    }
    expect(widths.at(-2)).toBeGreaterThan(0);
    expect(widths.at(-1)).toBe(0);
    const ratio = narrowing(scalePx(statement.maxWidth), 0);
    expect(Number.isFinite(ratio)).toBe(true);
    expect(ratio).toBe(scalePx(statement.maxWidth));

    const bullets = { type: 'slideBulletList', items: ['One'] };
    let nested: object = { type: 'slideStatement', text: 'Short' };
    for (let depth = 0; depth < 3; depth += 1) {
      nested = {
        type: 'slideSplit',
        ratio: 'aside',
        divider: 'hairline',
        panes: [{ items: [nested] }, { items: [bullets] }],
      };
    }
    expect(renderedStep('statement-textSize', nested)).toBe('s');
  });

  it('sizes a statement in a pane against the pane, not the frame', () => {
    const text = 'x'.repeat(statementFit.l);
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const node = {
      type: 'slideSplit',
      panes: [
        { items: [{ type: 'slideStatement', text }] },
        { items: [{ type: 'slideBulletList', items: ['One'] }] },
      ],
    };
    const step = sizeForLoad(
      undefined,
      text.length * narrowing(scalePx(statement.maxWidth), pane),
      statementFit,
      slideLayout(undefined).crowding
    );
    expect(step).not.toBe('l');
    expect(renderedStep('statement-textSize', node)).toBe(step);
    expect(
      renderedStep('statement-textSize', { type: 'slideStatement', text })
    ).toBe('l');
  });

  it('sizes a quote in a pane against the pane, not the frame', () => {
    const quote = {
      type: 'slideQuote',
      text: 'x'.repeat(quoteFit.l),
      source: 'A',
    };
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const step = sizeForLoad(
      undefined,
      quoteFit.l * narrowing(scalePx(quoteTheme.maxWidth), pane),
      quoteFit,
      slideLayout(undefined).crowding
    );
    expect(step).not.toBe('l');
    expect(
      renderedStep('quote-textSize', {
        type: 'slideSplit',
        panes: [
          { items: [quote] },
          { items: [{ type: 'slideBulletList', items: ['One'] }] },
        ],
      })
    ).toBe(step);
  });
});

describe('paneLayouts', () => {
  const runtime = createIsomerRuntime({
    packs: [slidesPack],
    frames: { slide: slideDeckFrame },
  });
  const takumi = createTakumiImageBackend({ fonts: slideFonts });
  const runs = (box: LayoutBox): LayoutBox['runs'] => [
    ...box.runs,
    ...box.children.flatMap(runs),
  ];
  const labelLines = async (node: SlideSplitNode, words: RegExp) => {
    const layout = await takumi.measure(
      runtime.surfaces.snapshot.render({
        type: 'view',
        body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
      })
    );
    return new Set(
      runs(layout)
        .filter(({ text }) => words.test(text))
        .map(({ y }) => Math.round(y))
    ).size;
  };
  const lineHeight =
    scalePx(split.label.size) * parseFloat(split.label.lineHeight.value);

  const aside = (label: string, tone?: 'accent'): SlideSplitNode => ({
    type: 'slideSplit',
    ratio: 'aside',
    panes: [
      { items: [{ type: 'slideBulletList', items: ['One'] }] },
      {
        label,
        ...(tone && { tone }),
        items: [{ type: 'slideBulletList', items: ['One'] }],
      },
    ],
  });
  const estimatedLines = (node: SlideSplitNode) =>
    (frameBodyHeight -
      paneLayouts(openBody, node)[1].height -
      scalePx(split.labelGap)) /
    lineHeight;
  const long = 'What the other team runs today in every region';

  it.each([
    ['one line', 'Ours', /OURS/],
    ['a label that wraps in the aside column', long, /WHAT|REGION/],
  ])('takes %s as many lines as takumi draws', async (_name, label, words) => {
    const node = aside(label);
    const lines = await labelLines(node, words);
    expect(estimatedLines(node)).toBeCloseTo(lines);
  });

  it('never takes fewer lines than takumi draws beside a tone cue', async () => {
    const node = aside(long, 'accent');
    const lines = await labelLines(node, /WHAT|REGION/);
    expect(lines).toBe(2);
    expect(Math.round(estimatedLines(node))).toBeGreaterThanOrEqual(lines);
    expect(Math.round(estimatedLines(node))).toBeLessThanOrEqual(lines + 1);
  });
});

describe('a pane', () => {
  const tall = (label?: string): SlideSplitNode => ({
    type: 'slideSplit',
    footnote: 'Figures are from the last quarter.',
    panes: [
      {
        ...(label && { label }),
        items: [
          { type: 'slideBulletList', items: ['One', 'Two'] },
          { ...fullLayers, size: 'l' },
        ],
      },
      { label: 'After', items: [{ type: 'slideBulletList', items: ['One'] }] },
    ],
  });

  it.each([undefined, 'Before'])(
    'reports an item past its height, under label %s and the footnote',
    async (label) => {
      expect(await findings(slideOf(tall(label)))).toEqual([
        {
          kind: 'overflow',
          path: 'body[0].body[0].panes[0].items[1]',
          type: 'slideLayers',
          by: expect.any(Number) as number,
        },
      ]);
    }
  );

  it('counts its label against the item below it', async () => {
    const past = async (label?: string) =>
      (await findings(slideOf(tall(label))))[0]?.by ?? 0;
    const labelled = (await past('Before')) - (await past());
    expect(labelled).toBeGreaterThan(scalePx(split.labelGap));
    expect(labelled).toBeLessThanOrEqual(
      lineBox(split.label) + scalePx(split.labelGap)
    );
  });

  it('reports nothing when its items fit', async () => {
    const node = tall('Before');
    const [left, right] = node.panes;
    expect(
      await findings(
        slideOf({
          ...node,
          panes: [{ ...left, items: left.items.slice(0, 1) }, right],
        })
      )
    ).toEqual([]);
  });
});
