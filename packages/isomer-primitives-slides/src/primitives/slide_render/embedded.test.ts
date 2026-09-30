/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { resolveSlideRenders } from '../../resolve_renders';

import {
  findInTree,
  findNestedRender,
  TREE_WALK_MAX_DEPTH,
  TREE_WALK_MAX_VALUES,
} from './embedded';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

/** `levels` arrays, each holding the next, around an empty record. */
const nested = (levels: number): unknown => {
  let value: unknown = {};
  for (let level = 0; level < levels; level += 1) {
    value = [value];
  }
  return value;
};

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
  runtime.validate(compose(node)).errors.map(({ message }) => message);

describe('findInTree', () => {
  const never = () => false;

  it('walks to its depth limit and refuses one level past it', () => {
    expect(findInTree(nested(TREE_WALK_MAX_DEPTH), never)).toEqual({
      kind: 'none',
    });
    expect(findInTree(nested(TREE_WALK_MAX_DEPTH + 1), never)).toEqual({
      kind: 'tooDeep',
    });
  });

  it('visits up to its value limit and refuses one past it', () => {
    const records = (count: number) =>
      Array.from({ length: count }, () => ({}));
    expect(findInTree(records(TREE_WALK_MAX_VALUES - 1), never)).toEqual({
      kind: 'none',
    });
    expect(findInTree(records(TREE_WALK_MAX_VALUES), never)).toEqual({
      kind: 'tooLarge',
    });
  });

  it('stops a very wide array or record once its value budget is spent', () => {
    const wide = new Array<number>(5_000_000).fill(0);
    const started = performance.now();
    expect(findInTree(wide, never)).toEqual({ kind: 'tooLarge' });
    expect(findInTree([{ items: wide }], never)).toEqual({ kind: 'tooLarge' });
    expect(performance.now() - started).toBeLessThan(1_000);
    const record = Object.fromEntries(
      Array.from({ length: TREE_WALK_MAX_VALUES }, (_, at) => [`k${at}`, at])
    );
    expect(findInTree(record, never)).toEqual({ kind: 'tooLarge' });
    delete record.k0;
    expect(findInTree(record, never)).toEqual({ kind: 'none' });
  });

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

  it('refuses a deep slideStack chain without exhausting the stack', () => {
    expect(findNestedRender([stackChain(100_000)])).toEqual({
      kind: 'tooDeep',
    });
  });
});

describe('embedded body limits', () => {
  // Each slideStack takes two levels: the node, and its `items` array.
  const levels = Math.floor(TREE_WALK_MAX_DEPTH / 2);

  it('checks a stack chain inside the limit and refuses one past it', () => {
    const render = (count: number) => ({
      type: 'slideRender',
      surface: 'svg',
      body: [stackChain(count)],
    });
    const refusal = `an embedded body cannot be checked: it nests deeper than ${TREE_WALK_MAX_DEPTH} levels`;
    expect(errorsOf(render(levels - 1))).not.toContain(refusal);
    expect(errorsOf(render(levels + 1))).toContain(refusal);
  });

  it('refuses a window body past the limit', () => {
    const window = (count: number) => ({
      type: 'slideWindow',
      chrome: 'chat',
      title: 'Chat',
      body: [stackChain(count)],
    });
    const refusal = `a window body cannot be checked past ${TREE_WALK_MAX_DEPTH} levels or ${TREE_WALK_MAX_VALUES} values`;
    expect(errorsOf(window(levels - 1))).not.toContain(refusal);
    expect(errorsOf(window(levels + 1))).toContain(refusal);
  });

  it('leaves a render whose target cannot be checked unfilled', () => {
    const slide = (node: object) => compose(node);
    const slides = [
      {
        slug: 'host',
        composition: slide({
          type: 'slideRender',
          surface: 'svg',
          slide: 'deep',
        }),
      },
      { slug: 'deep', composition: slide(stackChain(100_000)) },
    ];
    expect(() => resolveSlideRenders(slides)).toThrow(
      `resolveSlideRenders: slide "host" renders slide "deep", which cannot be checked: it nests deeper than ${TREE_WALK_MAX_DEPTH} levels`
    );
  });
});
