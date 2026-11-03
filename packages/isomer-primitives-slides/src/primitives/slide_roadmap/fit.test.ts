/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  findings,
  lineCount,
  measured,
  nodeBox,
  slideOf,
  textBox,
} from '../../examples/measure';
import { marks } from '../../theme/components/marks';
import { roadmap } from '../../theme/components/roadmap';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { openBody, slideLayout, withLayout } from '../layout';
import { measureMarks, measureText } from '../size';

import { fullExample } from './examples';
import { roadmapStep, roadmapWordStep } from './fit';
import type { SlideRoadmapItem, SlideRoadmapNode } from './schema';

const word = 'settlementBatchNumber';
const inset = scalePx(marks.codeInset) + scalePx(marks.codeBorder);
const inBody = withLayout(undefined, openBody);

/** {@link fullExample}'s four horizons, one item each, the first `item`. */
const withFirst = (item: SlideRoadmapItem): SlideRoadmapNode => ({
  ...fullExample,
  columns: fullExample.columns.map((column, index) => ({
    ...column,
    items: [index === 0 ? item : { title: 'Next', body: 'Then' }],
  })),
});

const plain = withFirst({ title: 'Payouts', body: word });
const coded = withFirst({ title: 'Payouts', body: `\`${word}\`` });

/** The first item's body as takumi draws `node` at `size`, and its text run. */
const drawnBody = async (node: SlideRoadmapNode, size: SlideSize) => {
  const box = textBox(
    nodeBox(await measured(slideOf({ ...node, size })), 'slideRoadmap'),
    word
  );
  return { box, run: box.runs[0]! };
};

describe('roadmapStep with code marks', () => {
  it('takes m where a code chip is wider than its column at l, and a plain word keeps l', async () => {
    expect(roadmapStep(plain, slideLayout(inBody))).toBe('l');
    expect(roadmapStep(coded, slideLayout(inBody))).toBe('m');
    expect(await findings(slideOf(coded))).toEqual([]);
  });

  it('draws the chip on one line inside its column at m, where at l it breaks across lines', async () => {
    const [atM, atL] = await Promise.all([
      drawnBody(coded, 'm'),
      drawnBody(coded, 'l'),
    ]);
    expect(lineCount(atM.box)).toBe(1);
    expect(atM.run.x + atM.run.width + inset).toBeLessThanOrEqual(
      atM.box.x + atM.box.width
    );
    expect(lineCount(atL.box)).toBeGreaterThan(1);
  });

  it('measures a code word in an item title in mono, with no chip', () => {
    const at = (step: SlideSize) =>
      measureMarks(
        `\`${word}\``,
        { ...roadmap.itemTitle, size: roadmap.itemTitleSizes[step] },
        Infinity,
        'primary'
      ).widest;
    const gutters =
      3 * (2 * scalePx(roadmap.columnPadding) + scalePx(roadmap.rule));
    const column = at('l') - 1;
    const width = 4 * column + gutters;
    const titled = (title: string) => withFirst({ title, body: 'Then' });
    expect(
      measureText(word, {
        ...roadmap.itemTitle,
        size: roadmap.itemTitleSizes.l,
      }).widest
    ).toBeLessThan(column);
    expect(at('m')).toBeLessThan(column);
    expect(roadmapWordStep(titled(word), width)).toBe('l');
    expect(roadmapWordStep(titled(`\`${word}\``), width)).toBe('m');
    expect(roadmapWordStep(titled(`\`${word}\``), width + 4 * 2)).toBe('l');
  });
});
