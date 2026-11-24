/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  isInputRefusal,
  MAX_INPUT_DEPTH,
  MAX_INPUT_VALUES,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import {
  createSyntheticPack,
  syntheticFrame,
  type SyntheticNode,
  synthTree,
} from './synthetic_pack';

const runtimeOf = (primitives: number, fieldsPerPrimitive = 0) =>
  createIsomerRuntime({
    packs: [createSyntheticPack({ primitives, fieldsPerPrimitive })],
    frames: { synthetic: syntheticFrame },
  });

const depthOf = (node: SyntheticNode): number =>
  1 + Math.max(0, ...(node.items ?? []).map(depthOf));

const countOf = (nodes: readonly SyntheticNode[]): number =>
  nodes.reduce((sum, node) => sum + 1 + countOf(node.items ?? []), 0);

describe('synthTree', () => {
  it('holds exactly the nodes and depth asked for', () => {
    const tree = synthTree({ types: 3, nodes: 50, depth: 7 });
    expect(countOf(tree.body)).toBe(50);
    expect(Math.max(...tree.body.map(depthOf))).toBe(7);
    expect(new Set(tree.body.map(({ type }) => type))).toEqual(
      new Set(['box0', 'box1', 'box2'])
    );
  });

  it('spreads label characters across the nodes', () => {
    const { body } = synthTree({ types: 1, nodes: 10, labelCharacters: 1000 });
    expect(body.every(({ label }) => label.length === 100)).toBe(true);
  });

  it('refuses a chain deeper than its nodes', () => {
    expect(() => synthTree({ types: 1, nodes: 2, depth: 3 })).toThrow(
      'depth 3 needs at least 3 nodes'
    );
  });
});

describe('the synthetic pack', () => {
  it.each([
    { primitives: 1, nodes: 10, depth: 1 },
    { primitives: 200, nodes: 200, depth: 1 },
    { primitives: 10, nodes: 4000, depth: 1 },
    { primitives: 10, nodes: 100, depth: MAX_INPUT_DEPTH / 4 },
  ])(
    'validates and renders $nodes nodes of $primitives types, $depth deep',
    ({ primitives, nodes, depth }) => {
      const runtime = runtimeOf(primitives, 4);
      const tree = synthTree({ types: primitives, nodes, depth });
      const validation = runtime.validate(tree);
      expect(validation.valid).toBe(true);

      const { surfaces } = runtime;
      expect(
        surfaces.text.render(tree).split('\n').filter(Boolean)
      ).toHaveLength(nodes);
      expect(surfaces.html.render(tree).html).toContain(tree.body[0]?.label);
      expect(surfaces.markdown.render(tree)).toContain(tree.body[0]?.label);
      expect(surfaces.slack.render(tree).blocks.length).toBeGreaterThan(0);
      expect(surfaces.snapshot.render(tree).height).toBe(tree.body.length * 20);
    }
  );

  it('refuses a tree past the input budget before parsing it', () => {
    const runtime = runtimeOf(1);
    const validation = runtime.validate(
      synthTree({ types: 1, nodes: Math.ceil(MAX_INPUT_VALUES / 3) + 1 })
    );
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors.some(isInputRefusal)).toBe(true);
    }
  });

  it('refuses a node that is not one of its types', () => {
    const outside: SyntheticNode = { type: 'box2', label: 'x' };
    const validation = runtimeOf(2).validate({ type: 'view', body: [outside] });
    expect(validation.valid).toBe(false);
  });
});
