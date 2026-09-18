/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { Composition } from '../composition/composition';
import type { PrimitiveNode } from '../composition/node';
import { fixtureDefinitions, type FixtureNode } from '../testing/sdk.fixtures';

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
