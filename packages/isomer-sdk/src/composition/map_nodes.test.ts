/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { Composition } from '../composition/composition';
import type { PrimitiveNode } from '../composition/node';
import {
  fixtureDefinitions,
  type FixtureNode,
  type StackNode,
} from '../testing/sdk.fixtures';

import { mapCompositionNodes } from './map_nodes';

const composition = (body: FixtureNode[]): Composition<FixtureNode> => ({
  type: 'view',
  body,
});

/** Uppercases a fixture `note`'s body, leaving every other node alone. */
const shoutNotes = (node: PrimitiveNode): PrimitiveNode =>
  node.type === 'note'
    ? ({
        ...node,
        body: (node as unknown as { body: string }).body.toUpperCase(),
      } as PrimitiveNode)
    : node;

describe('mapCompositionNodes', () => {
  it('applies fn to every top-level node', () => {
    const result = mapCompositionNodes(
      composition([
        { type: 'note', body: 'a' },
        { type: 'note', body: 'b' },
      ]),
      fixtureDefinitions,
      shoutNotes
    );

    expect(result.body).toEqual([
      { type: 'note', body: 'A' },
      { type: 'note', body: 'B' },
    ]);
  });

  it('rewrites a container child in place at its declared path', () => {
    const result = mapCompositionNodes(
      composition([{ type: 'stack', items: [{ type: 'note', body: 'a' }] }]),
      fixtureDefinitions,
      shoutNotes
    );

    expect(result.body).toEqual([
      { type: 'stack', items: [{ type: 'note', body: 'A' }] },
    ]);
  });

  it('maps depth-first, so a container sees its children already mapped', () => {
    const seen: string[] = [];
    mapCompositionNodes(
      composition([{ type: 'stack', items: [{ type: 'note', body: 'a' }] }]),
      fixtureDefinitions,
      (node) => {
        seen.push(node.type);
        return node;
      }
    );

    expect(seen).toEqual(['note', 'stack']);
  });

  it('leaves the rest of the composition untouched', () => {
    const result = mapCompositionNodes(
      composition([{ type: 'note', body: 'a' }]),
      fixtureDefinitions,
      (node) => node
    );

    expect(result).toEqual({
      type: 'view',
      body: [{ type: 'note', body: 'a' }],
    });
  });

  it('rewrites a child under a dotted path such as items[0].node', () => {
    const containers = fixtureDefinitions.map((definition) =>
      definition.type === 'stack'
        ? {
            ...definition,
            children: (node: unknown) =>
              (node as { items: { node: unknown }[] }).items.map(
                (item, index) => ({
                  node: item.node,
                  path: `items[${index}].node`,
                })
              ),
          }
        : definition
    );
    const wrapped = {
      type: 'stack',
      items: [{ node: { type: 'note', body: 'a' } }],
    } as unknown as FixtureNode;

    const result = mapCompositionNodes(
      composition([wrapped]),
      containers,
      (node) => (node.type === 'note' ? { ...node, body: 'b' } : node)
    );

    expect(result.body[0]).toEqual({
      type: 'stack',
      items: [{ node: { type: 'note', body: 'b' } }],
    });
  });

  it('returns what fn returns for a leaf and a fresh copy of every container', () => {
    const note: FixtureNode = { type: 'note', body: 'a' };
    const stack: FixtureNode = { type: 'stack', items: [note] };
    const result = mapCompositionNodes(
      composition([note, stack]),
      fixtureDefinitions,
      (node) => node
    );

    expect(result.body[0]).toBe(note);
    expect(result.body[1]).not.toBe(stack);
    expect(result.body[1]).toEqual(stack);
    expect((result.body[1] as StackNode).items[0]).toBe(note);
  });

  it('maps a node object once per occurrence', () => {
    const note: FixtureNode = { type: 'note', body: 'a' };
    const seen: PrimitiveNode[] = [];
    mapCompositionNodes(
      composition([note, { type: 'stack', items: [note, note] }]),
      fixtureDefinitions,
      (node) => {
        seen.push(node);
        return node;
      }
    );

    expect(seen.filter((node) => node === note)).toHaveLength(3);
  });

  it('maps a chain deeper than the call stack, children first', () => {
    const depth = 100_000;
    let deepest: FixtureNode = { type: 'note', body: 'a' };
    for (let level = 0; level < depth; level += 1) {
      deepest = { type: 'stack', items: [deepest] };
    }
    const order: string[] = [];
    const result = mapCompositionNodes(
      composition([deepest]),
      fixtureDefinitions,
      (node) => {
        order.push(node.type);
        return shoutNotes(node);
      }
    );

    let node = result.body[0] as FixtureNode;
    let levels = 0;
    while (node.type === 'stack') {
      node = node.items[0]!;
      levels += 1;
    }
    expect(levels).toBe(depth);
    expect(node).toEqual({ type: 'note', body: 'A' });
    expect(order[0]).toBe('note');
    expect(order).toHaveLength(depth + 1);
  });

  it('throws CYCLIC_COMPOSITION for a node nested in itself', () => {
    const stack: StackNode = { type: 'stack', items: [] };
    stack.items.push(stack);

    expect(() =>
      mapCompositionNodes(composition([stack]), fixtureDefinitions, (n) => n)
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'CYCLIC_COMPOSITION',
      }) as Error
    );
  });

  it('throws for a child path this parser cannot rewrite', () => {
    const containers = fixtureDefinitions.map((definition) =>
      definition.type === 'stack'
        ? {
            ...definition,
            children: () => [
              { node: { type: 'note', body: 'x' }, path: 'items["a"]' },
            ],
          }
        : definition
    );

    expect(() =>
      mapCompositionNodes(
        composition([{ type: 'stack', items: [{ type: 'note', body: 'a' }] }]),
        containers,
        (node) => node
      )
    ).toThrow(/cannot rewrite child at path "items\["a"\]"/);
  });
});
