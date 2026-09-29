/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createChildNodeWalker } from '../composition/body_node_base';

import { NODE_ANCHOR_ATTRIBUTE } from './anchors';
import { checkLayout, type LayoutBox } from './layout_check';

interface TestNode {
  type: string;
  items?: TestNode[];
}

const walk = createChildNodeWalker([
  {
    type: 'stack',
    children: ({ items = [] }: TestNode) =>
      items.map((node, index) => ({ node, path: `items[${index}]` })),
  },
]);

const leaf: TestNode = { type: 'leaf' };
const stack = (...items: TestNode[]): TestNode => ({ type: 'stack', items });

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  ...children: LayoutBox[]
): LayoutBox => ({ x, y, width, height, children });

const anchored = (type: string, laid: LayoutBox): LayoutBox => ({
  ...laid,
  attributes: { [NODE_ANCHOR_ATTRIBUTE]: type },
});

const canvas = (...children: LayoutBox[]) => box(0, 0, 1000, 500, ...children);

describe('checkLayout', () => {
  it('finds nothing when every node fits its room and clears its siblings', () => {
    const layout = canvas(
      anchored(
        'stack',
        box(
          0,
          0,
          400,
          200,
          anchored('leaf', box(10, 10, 100, 40)),
          anchored('leaf', box(10, 60, 100, 40))
        )
      ),
      anchored('leaf', box(500, 0, 100, 40))
    );
    expect(checkLayout(layout, [stack(leaf, leaf), leaf], walk)).toEqual([]);
  });

  it('reports a node past its anchored parent, by its path', () => {
    const layout = canvas(
      anchored(
        'stack',
        box(
          0,
          0,
          400,
          200,
          anchored('leaf', box(10, 10, 100, 40)),
          anchored('leaf', box(10, 60, 100, 40, box(10, 60, 100, 470)))
        )
      )
    );
    expect(checkLayout(layout, [stack(leaf, leaf)], walk)).toEqual([
      { kind: 'overflow', path: 'body[0].items[1]', type: 'leaf', by: 330 },
    ]);
  });

  it('reports a top-level node past the canvas', () => {
    const layout = canvas(anchored('leaf', box(950, 0, 100, 40)));
    expect(checkLayout(layout, [leaf], walk)).toEqual([
      { kind: 'overflow', path: 'body[0]', type: 'leaf', by: 50 },
    ]);
  });

  it('reports two siblings that land on each other', () => {
    const layout = canvas(
      anchored(
        'stack',
        box(
          0,
          0,
          400,
          200,
          anchored('leaf', box(10, 10, 100, 40)),
          anchored('leaf', box(10, 30, 100, 40))
        )
      )
    );
    expect(checkLayout(layout, [stack(leaf, leaf)], walk)).toEqual([
      {
        kind: 'overlap',
        path: 'body[0].items[0]',
        type: 'leaf',
        with: { path: 'body[0].items[1]', type: 'leaf' },
        by: 20,
      },
    ]);
  });

  it('compares painted text, not the boxes that hold it', () => {
    const run = (x: number, y: number) => ({ x, y, width: 80, height: 20 });
    const layout = canvas(
      anchored('leaf', { ...box(0, 0, 400, 100), runs: [run(0, 0)] }),
      anchored('leaf', { ...box(0, 50, 400, 100), runs: [run(0, 80)] })
    );
    expect(checkLayout(layout, [leaf, leaf], walk)).toEqual([]);
  });

  it('never compares a root node with the nodes nested in it', () => {
    const layout = anchored(
      'stack',
      box(
        0,
        0,
        400,
        200,
        anchored('leaf', box(0, 0, 400, 50)),
        anchored('leaf', box(0, 100, 400, 50))
      )
    );
    expect(checkLayout(layout, [stack(leaf, leaf)], walk)).toEqual([]);
  });

  it('never compares a node with the nodes nested in it', () => {
    const layout = canvas(
      anchored(
        'stack',
        box(0, 0, 400, 200, anchored('leaf', box(0, 0, 400, 200)))
      )
    );
    expect(checkLayout(layout, [stack(leaf)], walk)).toEqual([]);
  });

  it('leaves the content of a scaled box unchecked', () => {
    const picture: LayoutBox = {
      ...anchored(
        'stack',
        box(
          0,
          0,
          200,
          100,
          anchored('leaf', box(0, 0, 900, 100)),
          anchored('leaf', box(0, 0, 900, 100))
        )
      ),
      scale: 0.5,
    };
    expect(checkLayout(canvas(picture), [stack(leaf, leaf)], walk)).toEqual([]);
  });

  it('checks a scaled node by its own box', () => {
    const picture = { ...anchored('leaf', box(900, 0, 200, 100)), scale: 0.5 };
    expect(checkLayout(canvas(picture), [leaf], walk)).toEqual([
      { kind: 'overflow', path: 'body[0]', type: 'leaf', by: 100 },
    ]);
  });

  it('reports nothing for a type whose anchors and nodes disagree in count', () => {
    const layout = canvas(anchored('leaf', box(950, 0, 100, 40)));
    expect(checkLayout(layout, [leaf, leaf], walk)).toEqual([]);
  });

  it('ignores sub-pixel spill', () => {
    const layout = canvas(anchored('leaf', box(0, 0, 1000.5, 40)));
    expect(checkLayout(layout, [leaf], walk)).toEqual([]);
  });
});
