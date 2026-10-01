/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  MAX_INPUT_DEPTH,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { findInTree, findNestedRender } from './embedded';

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

describe('findInTree', () => {
  it('returns the first match in reading order, with its path', () => {
    const body = [
      { type: 'slideStack', items: [{ type: 'slideRender', surface: 'svg' }] },
      { type: 'slideRender', surface: 'text' },
    ];
    expect(findNestedRender(body)).toEqual({
      kind: 'found',
      path: [0, 'items', 0],
    });
  });

  it('walks a deep slideStack chain without exhausting the stack', () => {
    expect(findNestedRender([stackChain(100_000)])).toEqual({ kind: 'none' });
  });

  it('visits a shared or cyclic value once', () => {
    const cyclic: Record<string, unknown> = { type: 'slideStack' };
    cyclic.items = [cyclic, cyclic];
    expect(findNestedRender([cyclic])).toEqual({ kind: 'none' });
    let shared: unknown = {};
    for (let level = 0; level < 64; level += 1) {
      shared = [shared, shared];
    }
    let visits = 0;
    findInTree(shared, () => {
      visits += 1;
      return false;
    });
    expect(visits).toBe(1);
  });
});

describe('embedded and window bodies past the input budget', () => {
  const refusal = {
    code: 'INPUT_OVER_BUDGET',
    message: `input nests deeper than ${MAX_INPUT_DEPTH} levels`,
  };
  const render = (count: number) => ({
    type: 'slideRender',
    surface: 'svg',
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
