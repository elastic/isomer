/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  findings,
  measured,
  nodeBox,
  slideOf,
  textBox,
} from '../../examples/measure';
import { marks } from '../../theme/components/marks';
import { timeline } from '../../theme/components/timeline';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { openBody, withLayout } from '../layout';
import { lineFill, measureMarks, measureText } from '../size';
import { layoutContext } from '../size.fixtures';

import { fiveItemsExample, threeItemsExample } from './examples';
import {
  timelineHeadingLineCount,
  timelineStep,
  timelineWordStep,
} from './fit';
import type { SlideTimelineNode } from './schema';

const word = 'settlementBatchId';
const inset = scalePx(marks.codeInset) + scalePx(marks.codeBorder);
const inBody = withLayout(undefined, openBody);

const withFirst = (
  node: SlideTimelineNode,
  field: 'heading' | 'body',
  text: string
): SlideTimelineNode => ({
  ...node,
  items: node.items.map((item, index) =>
    index === 0 ? { ...item, [field]: text } : item
  ),
});

const plain = withFirst(fiveItemsExample, 'body', word);
const coded = withFirst(fiveItemsExample, 'body', `\`${word}\``);

/** The first item's body as takumi draws `node` at `size`, and its text run. */
const drawnBody = async (node: SlideTimelineNode, size: SlideSize) => {
  const box = textBox(
    nodeBox(await measured(slideOf({ ...node, size })), 'slideTimeline'),
    word
  );
  return { box, run: box.runs[0]! };
};

const quoted = (heading: string) =>
  `${timeline.quoteOpen.value}${heading}${timeline.quoteClose.value}`;

describe('timelineStep with code marks', () => {
  it('takes m where a code chip is wider than its column at l, and a plain word keeps l', async () => {
    expect(timelineStep(plain, inBody)).toBe('l');
    expect(timelineStep(coded, inBody)).toBe('m');
    expect(await findings(slideOf(coded))).toEqual([]);
  });

  it('draws the chip on one line inside its column at m, and past it at l', async () => {
    const [atM, plainAtM, atL] = await Promise.all([
      drawnBody(coded, 'm'),
      drawnBody(plain, 'm'),
      drawnBody(coded, 'l'),
    ]);
    expect(atM.box.height).toBe(plainAtM.box.height);
    expect(atM.run.x + atM.run.width + inset).toBeLessThanOrEqual(
      atM.box.x + atM.box.width
    );
    expect(atL.run.x + atL.run.width + inset).toBeGreaterThan(
      atL.box.x + atL.box.width
    );
  });

  it('measures a code word in a heading in mono, with no chip', () => {
    const at = (step: SlideSize) =>
      measureMarks(
        `\`${word}\``,
        { ...timeline.heading, size: timeline.headingSizes[step] },
        Infinity,
        'primary'
      ).widest;
    const column = at('l') - 1;
    const { length } = threeItemsExample.items;
    const width = length * column + scalePx(timeline.gap) * (length - 1);
    const headed = (heading: string) =>
      withFirst(threeItemsExample, 'heading', `Call ${heading} now`);
    expect(
      measureText(word, {
        ...timeline.heading,
        size: timeline.headingSizes.l,
      }).widest
    ).toBeLessThan(column);
    expect(at('m')).toBeLessThan(column);
    expect(timelineWordStep(headed(word), width)).toBe('l');
    expect(timelineWordStep(headed(`\`${word}\``), width)).toBe('m');
    expect(timelineWordStep(headed(`\`${word}\``), width + length * 2)).toBe(
      'l'
    );
  });

  it('counts the lines of a heading with code as it wraps in mono', () => {
    const role = { ...timeline.heading, size: timeline.headingSizes.l };
    const heading = `Call ${word} now`;
    const width = measureText(quoted(heading), role).widest / lineFill + 1;
    const context = layoutContext({ width });
    expect(
      measureMarks(quoted(`Call \`${word}\` now`), role, Infinity, 'primary')
        .widest
    ).toBeGreaterThan(width * lineFill);
    expect(timelineHeadingLineCount([heading], 'l', context)).toBe(1);
    expect(
      timelineHeadingLineCount([`Call \`${word}\` now`], 'l', context)
    ).toBe(2);
  });

  it('fits a heading with code on the line its mono holds, with no chip', () => {
    const role = { ...timeline.heading, size: timeline.headingSizes.l };
    const heading = quoted(`Call \`${word}\` now`);
    const width =
      measureMarks(heading, role, Infinity, 'primary').widest / lineFill + 1;
    expect(measureMarks(heading, role).widest).toBeGreaterThan(
      width * lineFill
    );
    expect(
      timelineHeadingLineCount(
        [`Call \`${word}\` now`],
        'l',
        layoutContext({ width })
      )
    ).toBe(1);
  });
});
