/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { definePrimitive } from '../define/primitive_module';

import {
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
} from './authoring_schema';

const schema = {
  $defs: {
    card: {
      type: 'object',
      properties: {
        tone: { $ref: '#/$defs/__schema3' },
        body: { type: 'array', items: { $ref: '#/$defs/bodyNode' } },
      },
    },
    note: { type: 'object', properties: { text: { type: 'string' } } },
    __schema3: { enum: ['primary', 'pink'] },
    bodyNode: {
      oneOf: [{ $ref: '#/$defs/card' }, { $ref: '#/$defs/note' }],
    },
  },
};

describe('authoringSchemaSubset', () => {
  it('keeps the defs a type reaches, with their ids, and stubs the body-node union', () => {
    const { $defs } = authoringSchemaSubset(schema, ['card']);
    expect(Object.keys($defs).sort()).toEqual([
      '__schema3',
      'bodyNode',
      'card',
    ]);
    expect($defs.__schema3).toBe(schema.$defs.__schema3);
    expect($defs.bodyNode).not.toHaveProperty('oneOf');
  });

  it('returns the same ids on every call', () => {
    expect(authoringSchemaSubset(schema, ['card', 'note'])).toEqual(
      authoringSchemaSubset(schema, ['card', 'note'])
    );
  });
});

describe('buildAuthoringJsonSchema def names', () => {
  const point = z.object({ label: z.string(), value: z.number() }).strict();
  const example = {
    type: 'delta' as const,
    before: { label: 'Then', value: 1 },
    after: { label: 'Now', value: 2 },
    note: { text: 'Doubled.' },
  };
  const delta = definePrimitive({
    type: 'delta',
    catalog: {
      type: 'delta',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example,
    },
    examples: [example],
    schema: z
      .object({
        type: z.literal('delta'),
        before: point,
        after: point,
        note: z.object({ text: z.string() }).strict(),
      })
      .strict(),
    renderers: { react: () => null, text: () => '', markdown: () => '' },
  });

  it('inlines a shape used once and names a shared one for where it is used', () => {
    const { $defs } = buildAuthoringJsonSchema([delta]) as {
      $defs: Record<string, { properties?: Record<string, unknown> }>;
    };
    expect(
      Object.keys($defs).filter((id) => id.startsWith('__schema'))
    ).toEqual([]);
    expect($defs).toHaveProperty(['delta.before+after']);
    expect($defs.delta?.properties?.after).toMatchObject({
      $ref: '#/$defs/delta.before+after',
    });
    expect($defs.delta?.properties?.note).toMatchObject({ type: 'object' });
  });

  it('escapes a def id in a $ref as a JSON Pointer, so every ref resolves', () => {
    const type = 'a/b~c';
    const node = {
      type,
      'x/y': { label: 'Then', value: 1 },
      'y~z': { label: 'Now', value: 2 },
    };
    const odd = definePrimitive({
      type,
      catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: node },
      examples: [node],
      schema: z
        .object({ type: z.literal(type), 'x/y': point, 'y~z': point })
        .strict(),
      renderers: { react: () => null, text: () => '', markdown: () => '' },
    });
    const built = buildAuthoringJsonSchema([odd]);
    const { $defs } = built as { $defs: Record<string, unknown> };
    const refs = [
      ...JSON.stringify(built).matchAll(/"\$ref":"#\/\$defs\/([^"]+)"/g),
    ].map(([, pointer]) => pointer ?? '');
    expect(refs.length).toBeGreaterThan(0);
    for (const pointer of refs) {
      expect(pointer).not.toMatch(/\/|~(?![01])/);
      expect($defs).toHaveProperty([
        pointer.replace(/~1/g, '/').replace(/~0/g, '~'),
      ]);
    }
  });

  it('resolves a shared shape reached through a described, inlined one', () => {
    const tone = z.enum(['primary', 'pink']);
    const described = tone.describe('Its color.');
    const node = {
      type: 'layered' as const,
      tone: 'pink' as const,
      layers: [
        { name: 'Edge', tone: 'primary' as const, accent: 'pink' as const },
      ],
      other: 'pink' as const,
    };
    const layered = definePrimitive({
      type: 'layered',
      catalog: {
        type: 'layered',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: node,
      },
      examples: [node],
      schema: z
        .object({
          type: z.literal('layered'),
          tone,
          layers: z.array(
            z
              .object({
                name: z.string(),
                tone: described.optional(),
                accent: described,
              })
              .strict()
          ),
          other: tone,
        })
        .strict(),
      renderers: { react: () => null, text: () => '', markdown: () => '' },
    });
    const schema = buildAuthoringJsonSchema([layered]);
    const { $defs } = schema as { $defs: Record<string, unknown> };
    const refs = [...JSON.stringify(schema).matchAll(/"#\/\$defs\/([^"]+)"/g)];
    expect(refs.map(([, id]) => id).filter((id) => !(id! in $defs))).toEqual(
      []
    );
  });

  it('names a shape several primitives share for its property, and repeats a small one', () => {
    const tone = z.enum(['primary', 'pink']);
    const mark = (type: 'marker' | 'badge') => {
      const node = {
        type,
        at: { label: 'Now', value: 1 },
        tone: 'pink' as const,
      };
      return definePrimitive({
        type,
        catalog: {
          type,
          purpose: '',
          useWhen: [],
          avoidWhen: [],
          example: node,
        },
        examples: [node],
        schema: z.object({ type: z.literal(type), at: point, tone }).strict(),
        renderers: { react: () => null, text: () => '', markdown: () => '' },
      });
    };
    const { $defs } = buildAuthoringJsonSchema([
      mark('marker'),
      mark('badge'),
    ]) as {
      $defs: Record<string, { properties?: Record<string, unknown> }>;
    };
    expect(Object.keys($defs).sort()).toEqual([
      'at',
      'badge',
      'bodyNode',
      'marker',
    ]);
    expect($defs.badge?.properties?.tone).toMatchObject({
      enum: ['primary', 'pink'],
    });
  });
});
