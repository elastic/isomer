/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { describeProps } from './prop_descriptors';

const schema = {
  $defs: {
    tone: {
      type: 'string',
      enum: ['primary', 'warning'],
      description: 'A tone.',
    },
    __schema1: { type: 'string', enum: ['a', 'b'] },
    __schema2: { type: 'array', items: { $ref: '#/$defs/tone' } },
    __schema3: { type: 'object', properties: { x: { type: 'string' } } },
    loop: { $ref: '#/$defs/loop' },
    bodyNode: {
      anyOf: [{ $ref: '#/$defs/card' }, { $ref: '#/$defs/plain' }],
    },
    card: {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'card' },
        title: { type: 'string', description: 'The heading.' },
        count: { type: 'integer', minimum: 0 },
        ratio: { type: 'number' },
        flag: { type: 'boolean' },
        tone: { $ref: '#/$defs/tone' },
        toneNote: { $ref: '#/$defs/tone', description: 'Own words.' },
        align: { $ref: '#/$defs/__schema1' },
        inline: { type: 'string', enum: ['left', 'right'] },
        tags: { type: 'array', items: { type: 'string' } },
        tones: { $ref: '#/$defs/__schema2' },
        choices: {
          type: 'array',
          items: { type: 'string', enum: ['x', 'y'] },
        },
        row: { $ref: '#/$defs/__schema3' },
        children: { type: 'array', items: { $ref: '#/$defs/bodyNode' } },
        child: { $ref: '#/$defs/bodyNode' },
        either: { anyOf: [{ const: 'a' }, { const: 'b' }] },
        maybe: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        mixed: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        cyclic: { $ref: '#/$defs/loop' },
        dangling: { $ref: '#/$defs/missing' },
        any: {},
      },
      required: ['type', 'title'],
    },
    plain: { type: 'string' },
    alias: { $ref: '#/$defs/card' },
  },
};

describe('describeProps', () => {
  const { card } = describeProps(schema, ['card']);
  const prop = (name: string) => card?.find((entry) => entry.name === name);

  it('lists every property in schema order with its requiredness', () => {
    expect(card?.map(({ name }) => name).slice(0, 3)).toEqual([
      'type',
      'title',
      'count',
    ]);
    expect(prop('title')).toEqual({
      name: 'title',
      type: 'string',
      kind: 'string',
      required: true,
      description: 'The heading.',
    });
    expect(prop('count')).toEqual({
      name: 'count',
      type: 'integer',
      kind: 'number',
      required: false,
    });
    expect(prop('ratio')).toMatchObject({ type: 'number', kind: 'number' });
    expect(prop('flag')).toMatchObject({ type: 'boolean', kind: 'boolean' });
  });

  it('reads a discriminator const as a single-value enum', () => {
    expect(prop('type')).toMatchObject({
      type: 'card',
      kind: 'enum',
      values: ['card'],
      required: true,
    });
  });

  it('names a named def and spells out an inline or anonymous enum', () => {
    expect(prop('tone')).toMatchObject({
      type: 'tone',
      kind: 'enum',
      values: ['primary', 'warning'],
      description: 'A tone.',
    });
    expect(prop('toneNote')?.description).toBe('Own words.');
    expect(prop('align')).toMatchObject({
      type: 'a | b',
      kind: 'enum',
      values: ['a', 'b'],
    });
    expect(prop('inline')).toMatchObject({
      type: 'left | right',
      kind: 'enum',
      values: ['left', 'right'],
    });
    expect(prop('either')).toMatchObject({
      type: 'a | b',
      kind: 'enum',
      values: ['a', 'b'],
    });
  });

  it('displays arrays by their item type', () => {
    expect(prop('tags')).toMatchObject({ type: 'string[]', kind: 'array' });
    expect(prop('tones')).toMatchObject({ type: 'tone[]', kind: 'array' });
    expect(prop('choices')).toMatchObject({ type: '(x | y)[]', kind: 'array' });
    expect(prop('children')).toMatchObject({
      type: 'bodyNode[]',
      kind: 'array',
    });
  });

  it('describes objects, unions, and unresolvable shapes without throwing', () => {
    expect(prop('row')).toMatchObject({ type: 'object', kind: 'object' });
    expect(prop('child')).toMatchObject({ type: 'bodyNode', kind: 'other' });
    expect(prop('maybe')).toMatchObject({
      type: 'string | null',
      kind: 'string',
    });
    expect(prop('mixed')).toMatchObject({
      type: 'string | number',
      kind: 'other',
    });
    expect(prop('cyclic')).toMatchObject({ type: 'loop', kind: 'other' });
    expect(prop('dangling')).toMatchObject({ type: 'missing', kind: 'other' });
    expect(prop('any')).toMatchObject({ type: 'unknown', kind: 'other' });
  });

  it('follows a ref to the def and yields nothing for a non-object', () => {
    const result = describeProps(schema, ['alias', 'plain', 'loop', 'nope']);
    expect(result.alias).toEqual(card);
    expect(result.plain).toEqual([]);
    expect(result.loop).toEqual([]);
    expect(result.nope).toEqual([]);
  });
});
