/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { layoutFindings, noFindings, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { tallestExample } from '../slide_heading/examples';
import { paneWidths } from '../slide_split/pane_context';

import { pipelineLoad, pipelineStep } from './fit';
import type { SlidePipelineNode } from './schema';

const prose =
  'The processor returns the funds and posts one line to the ledger before the batch window closes each night ';

const bodyOf = (length: number): string =>
  prose
    .repeat(Math.ceil(length / prose.length))
    .slice(0, length)
    .trim();

const titles = ['Verify', 'Score', 'Approve', 'Settle', 'Refund', 'Notify'];

const shape =
  (count: number, terminals: boolean) =>
  (length: number): SlidePipelineNode => ({
    type: 'slidePipeline',
    ...(terminals ? { start: 'Refund request', end: 'Ledger entry' } : {}),
    steps: titles
      .slice(0, count)
      .map((title) => ({ title, body: bodyOf(length) })),
  });

/** Whether `node` draws at `step` or larger in `width`. */
const drawsAt = (
  node: SlidePipelineNode,
  step: SlideSize,
  width = frameContentWidth
) =>
  slideSizes.indexOf(pipelineStep(node, { width })) <= slideSizes.indexOf(step);

/** The longest body at which `make` still draws at `step` or larger in `width`. */
const heaviest = (
  make: (length: number) => SlidePipelineNode,
  step: SlideSize,
  width = frameContentWidth
): number => {
  let length = 1;
  while (drawsAt(make(length + 1), step, width) && length < 2000) {
    length += 1;
  }
  return length;
};

describe('pipelineLoad', () => {
  const node = shape(4, false)(120);

  it('grows as the columns narrow, from the width and the terminals', () => {
    const full = pipelineLoad(node, 'l');
    const [half] = paneWidths(frameContentWidth, 'even', 'gap');
    expect(pipelineLoad(node, 'l', half)).toBeGreaterThan(2 * full);
    expect(pipelineLoad(shape(4, true)(120), 'l')).toBeGreaterThan(full);
  });

  it('is unbounded at a step where a title outgrows its column', () => {
    const wide = {
      ...node,
      steps: [{ title: 'Reconciliation' }, { title: 'Done' }],
    };
    expect(pipelineLoad(wide, 'l')).toBeLessThan(Infinity);
    expect(pipelineLoad(wide, 'l', 500)).toBe(Infinity);
  });
});

describe('pipelineStep', () => {
  const make = shape(4, false);
  const atL = heaviest(make, 'l');
  const atM = heaviest(make, 'm');

  it('steps down at each budget, on both sides of it', () => {
    expect(pipelineStep(make(atL), {})).toBe('l');
    expect(pipelineStep(make(atL + 1), {})).toBe('m');
    expect(pipelineStep(make(atM), {})).toBe('m');
    expect(pipelineStep(make(atM + 1), {})).toBe('s');
  });

  it('keeps an authored size', () => {
    expect(pipelineStep({ ...make(atM + 1), size: 'l' }, {})).toBe('l');
    expect(pipelineStep({ ...make(1), size: 's' }, {})).toBe('s');
  });

  it('steps down under a crowded heading and in a narrower column', () => {
    expect(pipelineStep(make(atL), { crowding: 1.05 })).toBe('m');
    expect(pipelineStep(make(atL + 1), { crowding: 0.8 })).toBe('l');
    const [half] = paneWidths(frameContentWidth, 'even', 'gap');
    expect(pipelineStep(make(atL), { width: half })).not.toBe('l');
  });
});

// Measured under the tallest heading, where crowding is 1: the heaviest body each step takes still fits at it.
describe('pipeline budgets fit what they allow', () => {
  // A shape whose titles outgrow their columns at a step never draws at it.
  const cases = [2, 4, 6]
    .flatMap((count) =>
      [false, true].flatMap((terminals) =>
        (['l', 'm'] as const).map((step) => ({ count, terminals, step }))
      )
    )
    .filter(({ count, terminals, step }) =>
      drawsAt(shape(count, terminals)(1), step)
    );

  it.each(cases)(
    '$count steps, terminals $terminals, at $step',
    async ({ count, terminals, step }) => {
      const make = shape(count, terminals);
      const node = make(heaviest(make, step));
      expect(pipelineStep(node, {})).toBe(step);
      expect(
        await layoutFindings(slideOf(tallestExample, { ...node, size: step }))
      ).toEqual(noFindings);
    }
  );

  it.each(['l', 'm'] as const)('in half a split, at %s', async (step) => {
    const [width] = paneWidths(frameContentWidth, 'even', 'gap');
    const make = shape(3, false);
    const node = make(heaviest(make, step, width));
    expect(
      await layoutFindings(
        slideOf(tallestExample, {
          type: 'slideSplit',
          panes: [
            { items: [{ ...node, size: step }] },
            { items: [{ type: 'slideBulletList', items: ['One'] }] },
          ],
        })
      )
    ).toEqual(noFindings);
  });
});
