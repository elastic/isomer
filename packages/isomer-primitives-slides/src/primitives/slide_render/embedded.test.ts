/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  createChildNodeWalker,
  definePrimitive,
  definePrimitivePack,
  MAX_INPUT_DEPTH,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDeckPrimitives } from '../../registry';

import { findNestedRender, findNode } from './embedded';

const slideWalk = createChildNodeWalker(slideDeckPrimitives);

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

/** A `slideStack` holding a `slideStack`, `count` deep, around one bullet list. */
const stackChain = (count: number): object => {
  let node: object = { type: 'slideBulletList', items: ['Deepest'] };
  for (let level = 0; level < count; level += 1) {
    node = { type: 'slideStack', items: [node] };
  }
  return node;
};

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorsOf = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ code, message }) => ({ code, message }));

describe('findNestedRender', () => {
  it('returns the first render in reading order, with its path', () => {
    const body = [
      {
        type: 'slideStack',
        items: [{ type: 'slideRender', surface: 'snapshot' }],
      },
      { type: 'slideRender', surface: 'text' },
    ];
    expect(findNestedRender(body)).toEqual({
      kind: 'found',
      path: [0, 'items', 0],
    });
  });

  it('follows child slots, not fields that hold data', () => {
    const data = { type: 'chart', config: { type: 'slideRender' } };
    expect(findNestedRender([data])).toEqual({ kind: 'none' });
    expect(
      findNestedRender([
        { type: 'slideHeading', title: 'Data', extra: { type: 'slideRender' } },
      ])
    ).toEqual({ kind: 'none' });
    expect(
      findNestedRender([
        {
          type: 'slideSplit',
          panes: [{ items: [data] }, { items: [{ type: 'slideRenderGrid' }] }],
        },
      ])
    ).toEqual({ kind: 'found', path: [0, 'panes', 1, 'items', 0] });
  });

  it('reads another pack’s container only through a walker that knows it', () => {
    const box = {
      type: 'box',
      children: ({ items }: { items: unknown[] }) =>
        items.map((node, index) => ({ node, path: `items[${index}]` })),
    };
    const body = [{ type: 'box', items: [{ type: 'slideRender' }] }];
    expect(findNestedRender(body)).toEqual({ kind: 'none' });
    expect(
      findNestedRender(
        body,
        createChildNodeWalker([...slideDeckPrimitives, box])
      )
    ).toEqual({ kind: 'found', path: [0, 'items', 0] });
  });

  it('treats a node its definition cannot read as a leaf and keeps walking', () => {
    expect(
      findNestedRender([
        { type: 'slideStack', items: 'not nodes' },
        { type: 'slideStack', items: [{ type: 'slideRender' }] },
      ])
    ).toEqual({ kind: 'found', path: [1, 'items', 0] });
  });

  it('walks a deep slideStack chain without exhausting the stack', () => {
    expect(findNestedRender([stackChain(100_000)])).toEqual({ kind: 'none' });
  });

  it('visits a shared or cyclic node once', () => {
    const cyclic: Record<string, unknown> = { type: 'slideStack' };
    cyclic.items = [cyclic, cyclic];
    expect(findNestedRender([cyclic])).toEqual({ kind: 'none' });
    let shared: Record<string, unknown> = { type: 'slideHeading' };
    for (let level = 0; level < 64; level += 1) {
      shared = { type: 'slideStack', items: [shared, shared] };
    }
    let visits = 0;
    findNode([shared], slideWalk, () => {
      visits += 1;
      return false;
    });
    expect(visits).toBe(65);
  });
});

describe('embedded and window bodies holding foreign data', () => {
  interface ChartNode extends PrimitiveNode {
    type: 'chart';
    config: Record<string, unknown>;
  }
  const chartPrimitive = definePrimitive<ChartNode>({
    type: 'chart',
    catalog: {
      type: 'chart',
      purpose: 'A foreign node whose data looks like a node.',
      useWhen: ['A test needs one.'],
      avoidWhen: ['Anything else.'],
      example: { type: 'chart', config: {} },
    },
    examples: [{ type: 'chart', config: {} }],
    schema: z.object({ type: z.literal('chart'), config: z.looseObject({}) }),
    renderers: {
      react: () => null,
      text: () => 'chart',
      markdown: () => md.paragraph('chart'),
    },
  });
  const composed = createIsomerRuntime({
    packs: [
      slidesPack,
      definePrimitivePack({ id: 'charts', primitives: [chartPrimitive] }),
    ],
    frames: { slide: slideDeckFrame },
  });
  const errors = (node: object) =>
    composed.validate(compose(node)).errors.map(({ message }) => message);
  const chart = (config: object) => ({ type: 'chart', config });

  it.each([
    [
      'render',
      (body: object[]) => ({ type: 'slideRender', surface: 'snapshot', body }),
    ],
    [
      'window',
      (body: object[]) => ({
        type: 'slideWindow',
        chrome: 'chat',
        title: 'Chat',
        body,
      }),
    ],
  ])('a %s accepts a node-shaped value in a foreign node’s data', (_, node) => {
    expect(
      errors(
        node([chart({ type: 'slideRender' }), chart({ type: 'slideWindow' })])
      )
    ).toEqual([]);
  });

  it('still rejects a render or window in this pack’s child slots', () => {
    expect(
      errors({
        type: 'slideRender',
        surface: 'snapshot',
        body: [
          {
            type: 'slideStack',
            items: [{ type: 'slideRender', surface: 'snapshot', slide: 'a' }],
          },
        ],
      })
    ).toEqual(['an embedded body cannot hold another render']);
    expect(
      errors({
        type: 'slideWindow',
        chrome: 'chat',
        title: 'Chat',
        body: [
          {
            type: 'slideStack',
            items: [
              {
                type: 'slideWindow',
                chrome: 'chat',
                title: 'In',
                body: [chart({})],
              },
            ],
          },
        ],
      })
    ).toEqual(['a window cannot hold another window']);
  });
});

describe('embedded and window bodies past the input budget', () => {
  const refusal = {
    code: 'INPUT_OVER_BUDGET',
    message: `input nests deeper than ${MAX_INPUT_DEPTH} levels`,
  };
  const render = (count: number) => ({
    type: 'slideRender',
    surface: 'snapshot',
    body: [stackChain(count)],
  });
  const window = (count: number) => ({
    type: 'slideWindow',
    chrome: 'chat',
    title: 'Chat',
    body: [stackChain(count)],
  });

  it.each([
    ['render', render],
    ['window', window],
  ])('refuses a deep %s body before parsing it', (_, node) => {
    expect(errorsOf(node(2))).not.toContainEqual(refusal);
    expect(errorsOf(node(100_000))).toEqual([refusal]);
  });
});
