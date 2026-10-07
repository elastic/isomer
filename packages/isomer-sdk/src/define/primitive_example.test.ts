/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import {
  type ExampleNode,
  exampleNodes,
  type PrimitiveExample,
  primitiveExamples,
} from './primitive_example';
import { definePrimitive } from './primitive_module';

const noteSchema = z.object({ type: z.literal('note'), body: z.string() });
type NoteNode = z.infer<typeof noteSchema>;

const bare: NoteNode = { type: 'note', body: 'Plain' };
const named: PrimitiveExample<NoteNode> = {
  name: 'Warning tone',
  description: 'A note that warns.',
  node: { type: 'note', body: 'Careful' },
};

const note = definePrimitive({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: bare,
  },
  examples: [
    bare,
    named,
    { name: 'Short', node: { type: 'note' as const, body: 'Hi' } },
  ],
  schema: noteSchema,
  renderers: { react: () => null, text: () => '', markdown: () => '' },
});

describe('primitive examples', () => {
  it('reads bare and named examples as one shape', () => {
    expect(primitiveExamples(note)).toEqual([
      { node: bare },
      {
        name: 'Warning tone',
        description: 'A note that warns.',
        node: named.node,
      },
      { name: 'Short', node: { type: 'note', body: 'Hi' } },
    ]);
  });

  it('lists the nodes alone', () => {
    expect(exampleNodes(note)).toEqual([
      bare,
      named.node,
      { type: 'note', body: 'Hi' },
    ]);
  });

  it('infers the node type through named examples', () => {
    expectTypeOf(exampleNodes(note)).toEqualTypeOf<NoteNode[]>();
  });

  it('keeps every node type across a union of definitions', () => {
    const chart = definePrimitive({
      type: 'chart',
      catalog: { ...note.catalog, type: 'chart' },
      examples: [{ type: 'chart' as const, series: 1 }],
      schema: z.object({ type: z.literal('chart'), series: z.number() }),
      renderers: { react: () => null, text: () => '', markdown: () => '' },
    });
    const registry = [note, chart];
    expectTypeOf(
      registry.flatMap((definition) => exampleNodes(definition))
    ).toEqualTypeOf<(NoteNode | { type: 'chart'; series: number })[]>();
    expectTypeOf<
      ExampleNode<(typeof registry)[number]['examples'][number]>
    >().toEqualTypeOf<NoteNode | { type: 'chart'; series: number }>();
  });
});
