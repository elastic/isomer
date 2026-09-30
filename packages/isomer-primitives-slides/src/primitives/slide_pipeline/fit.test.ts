/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutBox } from '@elastic/isomer-image-takumi';
import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { pipeline } from '../../theme/components/pipeline';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { layoutContext } from '../size.fixtures';
import { tallestExample } from '../slide_heading/examples';
import { paneWidths } from '../slide_split/pane_layout';

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
  slideSizes.indexOf(pipelineStep(node, layoutContext({ width }))) <=
  slideSizes.indexOf(step);

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

  it('measures a line break as the space it draws, in a terminal and in a body', () => {
    const started = (start: string) => pipelineLoad({ ...node, start }, 'l');
    expect(started('Refund\nrequest')).toBe(started('Refund request'));
    expect(started('Refund\nrequest')).toBeGreaterThan(
      started('Refundrequest')
    );
    const bodied = (body: string) =>
      pipelineLoad(
        { steps: [{ title: 'Verify', body }, { title: 'Score' }] },
        'l'
      );
    expect(bodied('Match\nthe\norder')).toBe(bodied('Match the order'));
    expect(bodied('Match\nthe\norder')).toBeGreaterThan(
      bodied('Matchtheorder')
    );
  });
});

describe('pipelineStep', () => {
  const make = shape(4, false);
  const atL = heaviest(make, 'l');
  const atM = heaviest(make, 'm');

  it('steps down at each budget, on both sides of it', () => {
    expect(pipelineStep(make(atL), layoutContext())).toBe('l');
    expect(pipelineStep(make(atL + 1), layoutContext())).toBe('m');
    expect(pipelineStep(make(atM), layoutContext())).toBe('m');
    expect(pipelineStep(make(atM + 1), layoutContext())).toBe('s');
  });

  it('keeps an authored size', () => {
    expect(pipelineStep({ ...make(atM + 1), size: 'l' }, layoutContext())).toBe(
      'l'
    );
    expect(pipelineStep({ ...make(1), size: 's' }, layoutContext())).toBe('s');
  });

  it('steps down under a crowded heading and in a narrower column', () => {
    expect(pipelineStep(make(atL), layoutContext({ crowding: 1.05 }))).toBe(
      'm'
    );
    expect(pipelineStep(make(atL + 1), layoutContext({ crowding: 0.8 }))).toBe(
      'l'
    );
    const [half] = paneWidths(frameContentWidth, 'even', 'gap');
    expect(pipelineStep(make(atL), layoutContext({ width: half }))).not.toBe(
      'l'
    );
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

  // Six steps between terminals leave columns narrower than "Approve" at `l` and `m`.
  it('measures every shape but six steps between terminals', () => {
    expect(cases).toHaveLength(10);
    expect(cases.some(({ count, terminals }) => count === 6 && terminals)).toBe(
      false
    );
  });

  it.each(cases)(
    '$count steps, terminals $terminals, at $step',
    async ({ count, terminals, step }) => {
      const make = shape(count, terminals);
      const node = make(heaviest(make, step));
      expect(pipelineStep(node, layoutContext())).toBe(step);
      expect(
        await findings(slideOf(tallestExample, { ...node, size: step }))
      ).toEqual([]);
    }
  );

  it.each(['l', 'm'] as const)('in half a split, at %s', async (step) => {
    const [width] = paneWidths(frameContentWidth, 'even', 'gap');
    const make = shape(3, false);
    const node = make(heaviest(make, step, width));
    expect(
      await findings(
        slideOf(tallestExample, {
          type: 'slideSplit',
          panes: [
            { items: [{ ...node, size: step }] },
            { items: [{ type: 'slideBulletList', items: ['One'] }] },
          ],
        })
      )
    ).toEqual([]);
  });
});

describe('terminal chips', () => {
  it('draw a line break as one space', async () => {
    const drawn = async (start: string): Promise<number> => {
      const [row] = nodeBox(
        await measured(
          slideOf(tallestExample, {
            type: 'slidePipeline',
            start,
            steps: titles.slice(0, 2).map((title) => ({ title })),
          })
        ),
        'slidePipeline'
      ).children;
      return row!.children[0]!.width;
    };
    expect(await drawn('Refund\nrequest')).toBe(await drawn('Refund request'));
    expect(await drawn('Refund\nrequest')).toBeGreaterThan(
      await drawn('Refundrequest')
    );
  });

  // Steps never shrink under their numerals, so terminals too wide for the row push it past its room.
  it('push the steps past the body rather than crushing them', async () => {
    const node: SlidePipelineNode = {
      type: 'slidePipeline',
      start: 'An incoming refund request from the customer portal',
      end: 'A reconciled ledger entry in the finance warehouse',
      steps: titles.slice(0, 4).map((title) => ({ title })),
    };
    const slide = slideOf(tallestExample, node);
    const circle = scalePx(pipeline.circleSize);
    const boxes = (box: LayoutBox): LayoutBox[] =>
      box.children.flatMap((child) => [child, ...boxes(child)]);
    const numerals = boxes(
      nodeBox(await measured(slide), 'slidePipeline')
    ).filter(({ width, height }) => width === circle && height === circle);
    expect(numerals).toHaveLength(node.steps.length);
    numerals.slice(1).forEach((numeral, index) => {
      const before = numerals[index]!;
      expect(before.x + before.width).toBeLessThanOrEqual(numeral.x);
    });
    expect(await findings(slide)).toEqual([
      {
        kind: 'overflow',
        path: 'body[0].body[1]',
        type: 'slidePipeline',
        by: expect.any(Number) as number,
      },
    ]);
  });
});
