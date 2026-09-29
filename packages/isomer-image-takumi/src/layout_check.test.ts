/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  checkLayout,
  createChildNodeWalker,
  definePrimitive,
  definePrimitivePack,
  type Frame,
  type LayoutBox as SdkLayoutBox,
  nodeAnchor,
  type PrimitiveNode,
  themeBound,
} from '@elastic/isomer-sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { createTakumiImageBackend, type LayoutBox } from './backend';

interface BlockNode extends PrimitiveNode {
  type: 'block';
  width: number;
}

const block = definePrimitive<BlockNode>({
  type: 'block',
  catalog: {
    type: 'block',
    purpose: 'A fixed-width box.',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'block', width: 50 },
  },
  examples: [{ type: 'block', width: 50 }],
  schema: z.object({ type: z.literal('block'), width: z.number() }),
  renderers: {
    react: (node, { context }) =>
      createElement('div', {
        ...nodeAnchor(context, node),
        style: { width: node.width, height: 20, flexShrink: 0 },
      }),
    text: () => 'block',
    markdown: () => 'block',
  },
});

const row: Frame<string> = {
  defaultWidth: 200,
  theme: { light: 'light', dark: 'dark' },
  estimateHeight: () => 100,
  wrap: (_header, body) =>
    createElement(
      'div',
      { style: { display: 'flex', width: 200, height: 100 } },
      body
    ),
};

const runtime = createIsomerRuntime({
  packs: [
    definePrimitivePack({
      id: 'test.blocks',
      primitives: [block],
      theme: themeBound<string>(),
    }),
  ],
  frames: { row },
});

describe('checkLayout over a takumi measure', () => {
  it('reads the layout box takumi returns', () => {
    expectTypeOf<LayoutBox>().toExtend<SdkLayoutBox>();
  });

  it('reports the node a real render pushes past the canvas', async () => {
    const body: BlockNode[] = [
      { type: 'block', width: 50 },
      { type: 'block', width: 300 },
    ];
    const layout = await createTakumiImageBackend().measure(
      runtime.surfaces.svg.render({ type: 'view', body }, { anchors: true })
    );

    expect(
      checkLayout(layout, body, createChildNodeWalker([block]), 'svg')
    ).toEqual([{ kind: 'overflow', path: 'body[1]', type: 'block', by: 150 }]);
  });
});
