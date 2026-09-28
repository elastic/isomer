/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { type SlideLayoutBox, slideOverflow, slideOverlaps } from './overflow';

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<SlideLayoutBox> = {}
): SlideLayoutBox => ({ x, y, width, height, children: [], ...extra });

/** A slide whose frame body spans 100–900 by 100–500, holding `nodes`. */
const slide = (...nodes: SlideLayoutBox[]): SlideLayoutBox =>
  box(0, 0, 1000, 600, {
    children: [
      box(0, 0, 1000, 600, {
        children: [box(100, 100, 800, 400, { children: nodes })],
      }),
    ],
  });

describe('slideOverflow on a synthetic layout', () => {
  it('finds nothing inside the body, or past it by no more than the tolerance', () => {
    expect(slideOverflow(slide(box(100, 100, 800, 400)))).toBeUndefined();
    expect(slideOverflow(slide(box(99.5, 100, 801, 400.5)))).toBeUndefined();
  });

  it.each([
    ['top', box(200, 80, 100, 50), { top: 20, right: 0, bottom: 0, left: 0 }],
    [
      'right',
      box(850, 200, 100, 50),
      { top: 0, right: 50, bottom: 0, left: 0 },
    ],
    [
      'bottom',
      box(200, 480, 100, 50),
      { top: 0, right: 0, bottom: 30, left: 0 },
    ],
    ['left', box(60, 200, 100, 50), { top: 0, right: 0, bottom: 0, left: 40 }],
  ])('measures content past the %s edge', (_side, node, sides) => {
    expect(slideOverflow(slide(node))).toEqual({ ...sides, nodes: [0] });
  });

  it('names each overflowing node by index, from a descendant too', () => {
    const inner = box(200, 150, 100, 50, {
      children: [box(200, 150, 100, 400)],
    });
    expect(
      slideOverflow(slide(box(200, 100, 100, 40), inner, box(850, 300, 90, 10)))
    ).toEqual({ top: 0, right: 40, bottom: 50, left: 0, nodes: [1, 2] });
  });

  it('measures a scaled node by its own box, not its unscaled contents', () => {
    const picture = box(200, 200, 200, 100, {
      scale: 0.5,
      children: [box(200, 200, 2000, 1000)],
    });
    expect(slideOverflow(slide(picture))).toBeUndefined();
  });

  it('ignores an empty box', () => {
    expect(slideOverflow(slide(box(2000, 2000, 0, 0)))).toBeUndefined();
  });
});

describe('slideOverlaps on a synthetic layout', () => {
  it('reports each pair of nodes whose painted parts overlap, by how far', () => {
    expect(
      slideOverlaps(
        slide(
          box(100, 100, 400, 100),
          box(100, 170, 400, 100),
          box(100, 400, 400, 50)
        )
      )
    ).toEqual([{ nodes: [0, 1], by: 30 }]);
  });

  it('compares text runs rather than a container box', () => {
    const container = box(100, 100, 400, 200, {
      runs: [{ x: 100, y: 100, width: 400, height: 40 }],
    });
    expect(slideOverlaps(slide(container, box(100, 200, 400, 50)))).toEqual([]);
    expect(slideOverlaps(slide(container, box(100, 120, 400, 50)))).toEqual([
      { nodes: [0, 1], by: 20 },
    ]);
  });

  it('ignores contact within the tolerance', () => {
    expect(
      slideOverlaps(slide(box(100, 100, 400, 100), box(100, 199.5, 400, 100)))
    ).toEqual([]);
  });

  it('treats a scaled node as one painted rectangle', () => {
    const picture = box(100, 100, 200, 100, {
      scale: 0.5,
      children: [box(100, 100, 2000, 2000)],
    });
    expect(slideOverlaps(slide(picture, box(400, 100, 100, 100)))).toEqual([]);
    expect(slideOverlaps(slide(picture, box(250, 150, 100, 100)))).toEqual([
      { nodes: [0, 1], by: 50 },
    ]);
  });
});
