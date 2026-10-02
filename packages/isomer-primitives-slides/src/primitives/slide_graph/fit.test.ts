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
import { graph } from '../../theme/components/graph';
import { marks } from '../../theme/components/marks';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { openBody, withLayout } from '../layout';
import { measureMarks, measureText } from '../size';

import { graphCaptionWidth, graphStep, graphWordStep } from './fit';
import type { SlideGraphNode } from './schema';

const word = 'captureAuthorization';
const inset = scalePx(marks.codeInset) + scalePx(marks.codeBorder);
const inBody = withLayout(undefined, openBody);

/** Four nodes in a row, the first defined by `body`. */
const row = (body: string, caption?: string): SlideGraphNode => ({
  type: 'slideGraph',
  ...(caption === undefined ? {} : { caption }),
  nodes: [
    { id: 'a', term: 'A', body },
    { id: 'b', term: 'B', body: 'x' },
    { id: 'c', term: 'C', body: 'x' },
    {
      id: 'd',
      term: 'D',
      body: 'x',
      ...(caption === undefined ? {} : { placement: 'above' as const }),
    },
  ],
  edges: [
    ['a', 'b'],
    ['b', 'c'],
    caption === undefined ? ['c', 'd'] : ['d', 'b'],
  ],
});

const plain = row(word);
const coded = row(`\`${word}\``);

/** The first node's body as takumi draws `node` at `size`, and its text run. */
const drawnBody = async (node: SlideGraphNode, size: SlideSize) => {
  const box = textBox(
    nodeBox(await measured(slideOf({ ...node, size })), 'slideGraph'),
    word
  );
  return { box, run: box.runs[0]! };
};

describe('graphStep with code marks', () => {
  it('takes m where a code chip is wider than its node at l, and a plain word keeps l', async () => {
    expect(graphStep(plain, inBody)).toBe('l');
    expect(graphStep(coded, inBody)).toBe('m');
    expect(await findings(slideOf(coded))).toEqual([]);
  });

  it('draws the chip on one line inside its node at m, where at l it takes a second line', async () => {
    const [atM, plainAtM, atL, plainAtL] = await Promise.all([
      drawnBody(coded, 'm'),
      drawnBody(plain, 'm'),
      drawnBody(coded, 'l'),
      drawnBody(plain, 'l'),
    ]);
    expect(atM.box.height).toBe(plainAtM.box.height);
    expect(atM.run.x + atM.run.width + inset).toBeLessThanOrEqual(
      atM.box.x + atM.box.width
    );
    expect(atL.box.height).toBeGreaterThan(plainAtL.box.height);
  });

  it('takes m where a code chip in the caption is wider than its span at l', () => {
    const at = (step: SlideSize) =>
      measureMarks(`\`${word}\``, {
        ...graph.caption,
        size: graph.captionSizes[step],
      }).widest;
    const span = at('l') - 1;
    const width = 3 * span + 2 * scalePx(graph.track);
    const captioned = (caption: string) => row('x', `Settled by ${caption}.`);
    expect(graphCaptionWidth(captioned(word), width)).toBeCloseTo(span);
    expect(
      measureText(word, { ...graph.caption, size: graph.captionSizes.l }).widest
    ).toBeLessThan(span);
    expect(at('m')).toBeLessThan(span);
    expect(graphWordStep(captioned(word), width)).toBe('l');
    expect(graphWordStep(captioned(`\`${word}\``), width)).toBe('m');
  });
});
