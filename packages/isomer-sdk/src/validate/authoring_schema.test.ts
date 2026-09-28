/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { afterEach, describe, expect, it } from 'vitest';
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

describe('authoringSchemaSubset own keys', () => {
  it('keeps a def whose id is also an Object.prototype name', () => {
    const { $defs } = authoringSchemaSubset(
      {
        $defs: {
          constructor: { type: 'object' },
          toString: { type: 'string' },
        },
      },
      ['constructor', 'toString']
    );
    expect($defs).toEqual({
      constructor: { type: 'object' },
      toString: { type: 'string' },
    });
  });
});

describe('buildAuthoringJsonSchema refs', () => {
  const point = z.object({ label: z.string(), value: z.number() }).strict();

  it('escapes a def id in a $ref as a JSON Pointer in a URI fragment, so every ref resolves', () => {
    const type = 'a/b~c%2F😀';
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
      expect(pointer).not.toMatch(/\/|~(?![01])|%(?![0-9A-F]{2})/);
      expect($defs).toHaveProperty([
        decodeURIComponent(pointer).replace(/~1/g, '/').replace(/~0/g, '~'),
      ]);
    }
  });
});

const primitiveOf = (type: string, shape: Record<string, z.ZodType>) => {
  const node = { type };
  return definePrimitive({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: node },
    examples: [node],
    schema: z.object({ type: z.literal(type), ...shape }).strict(),
    renderers: { react: () => null, text: () => '', markdown: () => '' },
  });
};

describe('buildAuthoringJsonSchema def ids', () => {
  it.each([
    [
      'a primitive type named like a def Zod generates',
      () => buildAuthoringJsonSchema([primitiveOf('__schema3', {})]),
    ],
    [
      'an extra def named like a def Zod generates',
      () =>
        buildAuthoringJsonSchema([primitiveOf('note', {})], {
          extraDefs: [{ id: '__schema0', schema: z.string() }],
        }),
    ],
    [
      'a primitive type the body-node union uses',
      () => buildAuthoringJsonSchema([primitiveOf('bodyNode', {})]),
    ],
    [
      'a primitive type a shared def uses',
      () => buildAuthoringJsonSchema([primitiveOf('tone', {})]),
    ],
    [
      'an extra def named for a shared def it does not replace',
      () =>
        buildAuthoringJsonSchema([primitiveOf('note', {})], {
          extraDefs: [{ id: 'tone', schema: z.string() }],
        }),
    ],
    [
      'an extra def named for the body-node union',
      () =>
        buildAuthoringJsonSchema([primitiveOf('note', {})], {
          extraDefs: [{ id: 'bodyNode', schema: z.string() }],
        }),
    ],
  ])('refuses %s, whose def id is taken', (_name, build) => {
    try {
      build();
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'INVALID_BODY_NODE',
        message: expect.stringMatching(/reserved|taken/) as unknown,
      });
    }
  });

  it('refuses a type id with an unpaired surrogate as an IsomerError', () => {
    try {
      buildAuthoringJsonSchema([primitiveOf('a\uD800b', {})]);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'INVALID_BODY_NODE',
      });
    }
  });
});

describe('buildAuthoringJsonSchema own keys', () => {
  afterEach(() => {
    delete (Object.prototype as { description?: unknown }).description;
  });

  it('describes only a def the schema holds, never Object.prototype', () => {
    buildAuthoringJsonSchema([primitiveOf('note', {})], {
      describe: JSON.parse('{"__proto__": "x"}') as Record<string, string>,
    });
    expect(({} as { description?: unknown }).description).toBeUndefined();
  });

  it('keeps an own __proto__ property through the rewrite passes, and its required entry with it', () => {
    const point = z.object({ label: z.string() }).strict();
    const shape: Record<string, z.ZodType> = { before: point, after: point };
    Object.defineProperty(shape, '__proto__', {
      configurable: true,
      enumerable: true,
      value: z.string(),
      writable: true,
    });
    const { $defs } = buildAuthoringJsonSchema([
      primitiveOf('delta', shape),
    ]) as {
      $defs: {
        delta: { properties: Record<string, unknown>; required: string[] };
      };
    };
    expect($defs.delta.required).toContain('__proto__');
    expect(Object.hasOwn($defs.delta.properties, '__proto__')).toBe(true);
  });
});
