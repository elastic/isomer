/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';

import { buildObjectBuilders, defineNodeBuilder } from './builders';

const calloutSchema = z.object({
  type: z.literal('callout'),
  tone: z.enum(['info', 'warning']),
  title: z.string(),
  body: z.string(),
});
type CalloutNode = z.infer<typeof calloutSchema> & PrimitiveNode;
const calloutExamples: CalloutNode[] = [
  { type: 'callout', tone: 'warning', title: 't', body: 'b' },
];

const callout = definePrimitive({
  type: 'callout',
  catalog: {
    type: 'callout',
    purpose: 'callout',
    useWhen: [],
    avoidWhen: [],
    example: calloutExamples[0],
  },
  examples: calloutExamples,
  schema: calloutSchema,
  renderers: {
    react: (node) => node.title,
    text: (node) => node.title,
    markdown: (node) => node.title,
  },
});

const noteSchema = z.object({ type: z.literal('note'), body: z.string() });
type NoteNode = z.infer<typeof noteSchema> & PrimitiveNode;
const noteExamples: NoteNode[] = [{ type: 'note', body: 'b' }];

const note = definePrimitive({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: 'note',
    useWhen: [],
    avoidWhen: [],
    example: noteExamples[0],
  },
  examples: noteExamples,
  schema: noteSchema,
  renderers: {
    react: (node) => node.body,
    text: (node) => node.body,
    markdown: (node) => node.body,
  },
});

describe('buildObjectBuilders', () => {
  const b = buildObjectBuilders([callout, note]);

  it('types each builder from its own primitive schema', () => {
    const built = b.callout({
      tone: 'warning',
      title: 'Latency moved up',
      body: '…',
    });
    expectTypeOf(built).toMatchTypeOf<{
      type: 'callout';
      tone: 'info' | 'warning';
      title: string;
      body: string;
    }>();
    expectTypeOf(b.note).parameter(0).not.toHaveProperty('tone');
    expect(built).toEqual({
      type: 'callout',
      tone: 'warning',
      title: 'Latency moved up',
      body: '…',
    });
    expect(b.note({ body: 'Hello' })).toEqual({ type: 'note', body: 'Hello' });
  });

  it('rejects fields the primitive does not declare', () => {
    // @ts-expect-error `bogus` is not a callout field.
    b.callout({ tone: 'info', title: 't', body: 'b', bogus: 1 });
    // @ts-expect-error `tone` belongs to callout, not note.
    b.note({ body: 'b', tone: 'info' });
    // @ts-expect-error `title` is required.
    b.callout({ tone: 'info', body: 'b' });
  });

  it('erases to string keys for a surface-erased inventory', () => {
    const erased = buildObjectBuilders(
      [callout, note].map((definition) => ({ type: definition.type }))
    );
    expect(erased.note({ body: 'x' })).toEqual({ type: 'note', body: 'x' });
  });
});

describe('defineNodeBuilder', () => {
  it('spreads the input onto the type tag without validating it', () => {
    const build = defineNodeBuilder<{ type: 'note'; body: string }>('note');
    expect(build({ body: 'Hello' })).toEqual({ type: 'note', body: 'Hello' });
  });
});
