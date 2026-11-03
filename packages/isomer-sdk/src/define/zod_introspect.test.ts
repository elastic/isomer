/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import {
  cloneZodSchema,
  isZodSchema,
  unwrapZod,
  unwrapZodOnce,
  zodArrayElement,
  zodDef,
  zodDefType,
  type ZodInputOf,
  zodLazyGetter,
  zodObjectHasCatchall,
  zodObjectShape,
  type ZodOutputOf,
  type ZodWrapperOf,
} from './zod_introspect';

describe('isZodSchema', () => {
  it('accepts schemas and rejects other values', () => {
    expect(isZodSchema(z.string())).toBe(true);
    expect(isZodSchema(z.object({}).optional())).toBe(true);
    expect(isZodSchema({ _zod: {} })).toBe(false);
    expect(isZodSchema({ _zod: { def: { type: 1 } } })).toBe(false);
    expect(isZodSchema(null)).toBe(false);
    expect(isZodSchema('string')).toBe(false);
  });
});

describe('zodDefType', () => {
  it('reads the type tag', () => {
    expect(zodDefType(z.string())).toBe('string');
    expect(zodDefType(z.object({}))).toBe('object');
    expect(zodDefType(z.string().optional())).toBe('optional');
    expect(zodDefType(z.string().default('a'))).toBe('default');
    expect(zodDefType({})).toBeUndefined();
  });
});

describe('unwrapZodOnce', () => {
  it('peels one wrapper layer in the default set', () => {
    const inner = z.string();
    expect(unwrapZodOnce(inner.optional())).toBe(inner);
    expect(unwrapZodOnce(inner.nullable())).toBe(inner);
    expect(unwrapZodOnce(inner.default('a'))).toBe(inner);
    expect(unwrapZodOnce(inner.readonly())).toBe(inner);
    expect(unwrapZodOnce(inner)).toBeUndefined();
  });

  it('peels only the kinds it is given', () => {
    const inner = z.string();
    const optionalOnly = new Set(['optional']);
    expect(unwrapZodOnce(inner.optional(), optionalOnly)).toBe(inner);
    expect(unwrapZodOnce(inner.nullable(), optionalOnly)).toBeUndefined();
    expect(unwrapZodOnce(inner.catch('a'))).toBeUndefined();
    expect(unwrapZodOnce(inner.catch('a'), new Set(['catch']))).toBe(inner);
  });

  it('returns undefined for a non-schema', () => {
    expect(unwrapZodOnce({ def: { type: 'optional' } })).toBeUndefined();
  });
});

describe('unwrapZod', () => {
  it('peels every wrapper layer', () => {
    const inner = z.array(z.string());
    expect(unwrapZod(inner.nullable().optional().default([]))).toBe(inner);
    expect(unwrapZod(inner)).toBe(inner);
  });
});

describe('zodArrayElement', () => {
  it('reads an array element and nothing else', () => {
    const element = z.number();
    expect(zodArrayElement(z.array(element))).toBe(element);
    expect(zodArrayElement(z.array(element).optional())).toBeUndefined();
    expect(zodArrayElement(z.string())).toBeUndefined();
  });
});

describe('zodObjectShape', () => {
  it('reads an object shape and nothing else', () => {
    const name = z.string();
    expect(zodObjectShape(z.object({ name }))).toEqual({ name });
    expect(zodObjectShape(z.object({ name }).optional())).toBeUndefined();
    expect(zodObjectShape(z.string())).toBeUndefined();
  });
});

describe('zodObjectHasCatchall', () => {
  it('distinguishes default objects from strict and loose ones', () => {
    expect(zodObjectHasCatchall(z.object({}))).toBe(false);
    expect(zodObjectHasCatchall(z.object({}).strict())).toBe(true);
    expect(zodObjectHasCatchall(z.object({}).loose())).toBe(true);
    expect(zodObjectHasCatchall(z.object({}).catchall(z.string()))).toBe(true);
  });
});

describe('zodLazyGetter', () => {
  it('reads a lazy schema getter', () => {
    const target = z.string();
    const getter = zodLazyGetter(z.lazy(() => target));
    expect(getter?.()).toBe(target);
    expect(zodLazyGetter(target)).toBeUndefined();
  });
});

describe('cloneZodSchema', () => {
  it('builds a new schema of the same class from a def', () => {
    const source = z.string().min(2);
    const copy = cloneZodSchema(source, zodDef(source));
    expect(copy).not.toBe(source);
    expect(zodDefType(copy)).toBe('string');
    expect(copy.safeParse('a').success).toBe(false);
    expect(copy.safeParse('ab').success).toBe(true);
  });
});

describe('type helpers', () => {
  it('read input, output, and wrapper inner types', () => {
    const transformed = z.string().transform((value) => value.length);
    expectTypeOf<ZodInputOf<typeof transformed>>().toEqualTypeOf<string>();
    expectTypeOf<ZodOutputOf<typeof transformed>>().toEqualTypeOf<number>();
    expectTypeOf<ZodInputOf<string>>().toBeNever();

    const inner = z.number();
    const wrapped = inner.optional();
    expect(unwrapZodOnce(wrapped)).toBe(inner);
    expect(transformed.parse('abc')).toBe(3);
    type Inner =
      typeof wrapped extends ZodWrapperOf<infer I> ? I : 'not a wrapper';
    expectTypeOf<Inner>().toEqualTypeOf<typeof inner>();
  });
});
