/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';

import { FEATURED_COUNT } from '../config';
import { componentsPack } from '../fixtures/components_pack';

import { describeRuntime } from './describe_runtime';
import { featuredProblems, pickFeatured } from './featured';

const { primitives } = describeRuntime(
  createIsomerRuntime<unknown, StyledRenderContext>({ packs: [componentsPack] })
);
const types = primitives.map(({ type }) => type);

describe('pickFeatured', () => {
  it('keeps the configured order and skips unknown types', () => {
    expect(
      pickFeatured(primitives, ['statGroup', 'nope', 'callout']).map(
        ({ type }) => type
      )
    ).toEqual(['statGroup', 'callout']);
    expect(pickFeatured(primitives, [])).toEqual([]);
  });

  it('draws distinct primitives at random without a configured list', () => {
    const picked = pickFeatured(primitives, undefined, () => 0);
    expect(picked.map(({ type }) => type)).toEqual(types);
    expect(new Set(picked).size).toBe(
      Math.min(FEATURED_COUNT, primitives.length)
    );

    const reversed = pickFeatured(primitives, undefined, () => 0.999);
    expect(reversed.map(({ type }) => type)).toEqual([...types].reverse());
  });

  it('caps a random draw at FEATURED_COUNT', () => {
    const many = Array.from({ length: FEATURED_COUNT * 2 }, (_, index) => ({
      ...primitives[0]!,
      type: `p${index}`,
    }));
    expect(pickFeatured(many, undefined)).toHaveLength(FEATURED_COUNT);
  });
});

describe('featuredProblems', () => {
  it('accepts an absent list or known, distinct types', () => {
    expect(featuredProblems(undefined, types)).toEqual([]);
    expect(featuredProblems(['callout', 'health'], types)).toEqual([]);
  });

  it('names unknown, repeated and non-string entries', () => {
    expect(featuredProblems('callout', types)).toEqual([
      'featured must be an array of primitive types.',
    ]);
    expect(featuredProblems(['callout', 'nope', 7, 'callout'], types)).toEqual([
      'featured[1] ("nope") names no primitive in the runtime.',
      'featured[2] must be a primitive type.',
      'featured[3] ("callout") repeats an earlier entry.',
    ]);
  });
});
