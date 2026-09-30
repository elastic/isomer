/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { openBody, withLayout } from '../layout';
import { renderedStep } from '../size.fixtures';
import { tallestExample } from '../slide_heading/examples';
import { headingRoom } from '../slide_heading/fit';
import { paneLayouts } from '../slide_split/pane_layout';
import type { SlideSplitNode } from '../slide_split/types';

import { example, fourNotesExample, unevenLanesExample } from './examples';
import { lanesHeight, lanesStep, lanesWidth } from './fit';
import type { SlideLanesNode } from './schema';

const inLayout = (width: number, height: number) =>
  withLayout(undefined, { width, height });

const split = (node: SlideLanesNode): SlideSplitNode => ({
  type: 'slideSplit',
  panes: [
    { items: [node] },
    { items: [{ type: 'slideBulletList', items: ['One'] }] },
  ],
});

const [pane] = paneLayouts(
  { width: frameContentWidth, height: headingRoom(tallestExample) },
  split(example)
);

const underTallest = inLayout(frameContentWidth, headingRoom(tallestExample));

const prose =
  'The customer picks the slot and validation runs on every field as they type it in ';
const coded =
  'The customer calls `reserve` and validation runs on every field as they type it in ';

/** `count` notes whose bodies repeat `text` to `length` characters. */
const noted =
  (text: string, count: number) =>
  (length: number): SlideLanesNode => ({
    ...example,
    notes: Array.from({ length: count }, (_, index) => ({
      title: `Path ${index + 1}`,
      body: text
        .repeat(Math.ceil(length / text.length))
        .slice(0, length)
        .trim(),
    })),
  });

/** The longest body at which `make` still draws at `step` or larger under the tallest heading. */
const heaviest = (
  make: (length: number) => SlideLanesNode,
  step: SlideSize
): number => {
  let length = 1;
  while (
    slideSizes.indexOf(lanesStep(make(length + 1), underTallest)) <=
      slideSizes.indexOf(step) &&
    length < 2000
  ) {
    length += 1;
  }
  return length;
};

/** The most steps and the most notes lanes take. */
const fullest: SlideLanesNode = {
  ...unevenLanesExample,
  notes: fourNotesExample.notes,
};

describe('lanesWidth and lanesHeight', () => {
  it('shrink at each smaller step', () => {
    for (const node of [example, fullest]) {
      expect(lanesWidth(node, 'm')).toBeLessThan(lanesWidth(node, 'l'));
      expect(lanesWidth(node, 's')).toBeLessThan(lanesWidth(node, 'm'));
      expect(lanesHeight(node, 'm', openBody.width)).toBeLessThan(
        lanesHeight(node, 'l', openBody.width)
      );
      expect(lanesHeight(node, 's', openBody.width)).toBeLessThan(
        lanesHeight(node, 'm', openBody.width)
      );
    }
  });

  it('grow in height as notes wrap in a narrower layout', () => {
    expect(lanesHeight(example, 'l', pane.width)).toBeGreaterThan(
      lanesHeight(example, 'l', openBody.width)
    );
    expect(lanesHeight(unevenLanesExample, 'l', pane.width)).toBe(
      lanesHeight(unevenLanesExample, 'l', openBody.width)
    );
  });
});

describe('lanesStep', () => {
  it.each(['l', 'm'] as const)(
    'takes %s at the height it needs there, and the next step one pixel short',
    (step) => {
      const height = lanesHeight(fourNotesExample, step, openBody.width);
      expect(
        lanesStep(fourNotesExample, inLayout(openBody.width, height))
      ).toBe(step);
      expect(
        lanesStep(fourNotesExample, inLayout(openBody.width, height - 1))
      ).toBe(slideSizes[slideSizes.indexOf(step) + 1]);
    }
  );

  it.each(['l', 'm'] as const)(
    'takes %s at the width it needs there, and the next step one pixel short',
    (step) => {
      const width = lanesWidth(unevenLanesExample, step);
      expect(
        lanesStep(unevenLanesExample, inLayout(width, openBody.height))
      ).toBe(step);
      expect(
        lanesStep(unevenLanesExample, inLayout(width - 1, openBody.height))
      ).toBe(slideSizes[slideSizes.indexOf(step) + 1]);
    }
  );

  it('takes s, the smallest step, where nothing fits', () => {
    expect(lanesStep(fullest, inLayout(lanesWidth(fullest, 's') - 1, 1))).toBe(
      's'
    );
  });

  it('keeps an authored size', () => {
    expect(lanesStep({ ...fullest, size: 'l' }, inLayout(1, 1))).toBe('l');
    expect(lanesStep({ ...unevenLanesExample, size: 's' }, undefined)).toBe(
      's'
    );
  });
});

const overflow = (path: string) => [
  {
    kind: 'overflow',
    path,
    type: 'slideLanes',
    by: expect.any(Number) as number,
  },
];

describe('lanes steps fit what they allow', () => {
  it.each([
    { name: 'prose', text: prose, count: 2, step: 'l' },
    { name: 'coded', text: coded, count: 2, step: 'l' },
    { name: 'prose', text: prose, count: 2, step: 'm' },
    { name: 'coded', text: coded, count: 4, step: 'm' },
  ] as const)(
    'the longest $count $name notes that take $step under the tallest heading fit',
    async ({ text, count, step }) => {
      const make = noted(text, count);
      const node = make(heaviest(make, step));
      expect(lanesStep(node, underTallest)).toBe(step);
      expect(await findings(slideOf(tallestExample, node))).toEqual([]);
    }
  );

  it.each([fourNotesExample, fullest])(
    'takes m under the tallest heading, where l runs past the body',
    async (node) => {
      expect(renderedStep('lanes-lanesSize', node, tallestExample)).toBe('m');
      expect(await findings(slideOf(tallestExample, node))).toEqual([]);
      expect(
        await findings(slideOf(tallestExample, { ...node, size: 'l' }))
      ).toEqual(overflow('body[0].body[1]'));
    }
  );

  it('fourNotesExample takes s in half a split, where m runs past the pane', async () => {
    expect(lanesStep(fourNotesExample, inLayout(pane.width, pane.height))).toBe(
      's'
    );
    expect(
      await findings(slideOf(tallestExample, split(fourNotesExample)))
    ).toEqual([]);
    expect(
      await findings(
        slideOf(tallestExample, split({ ...fourNotesExample, size: 'm' }))
      )
    ).toEqual(overflow('body[0].body[1].panes[0].items[0]'));
  });

  it.each([example, unevenLanesExample, fullest])(
    'reports lanes wider than half a split at every step',
    async (node) => {
      expect(lanesWidth(node, 's')).toBeGreaterThan(pane.width);
      expect(await findings(slideOf(tallestExample, split(node)))).toEqual(
        overflow('body[0].body[1].panes[0].items[0]')
      );
    }
  );
});
