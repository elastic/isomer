/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  createTypePrinter,
  jsDoc,
  type JsonObject,
  pascalCase,
} from './schema_to_typescript';

const printer = (defs: JsonObject = {}, names: [string, string][] = []) =>
  createTypePrinter({
    defs,
    names: new Map(names),
    claim: (base) => `${base}Alias`,
  });

describe('pascalCase', () => {
  it('capitalizes each word and keeps the rest of its case', () => {
    expect(pascalCase('slideStats')).toBe('SlideStats');
    expect(pascalCase('code-block_v2')).toBe('CodeBlockV2');
  });

  it('guards a leading digit and an empty name', () => {
    expect(pascalCase('2up')).toBe('_2up');
    expect(pascalCase('--')).toBe('Type');
  });
});

describe('jsDoc', () => {
  it('writes one line inline and several as a block', () => {
    expect(jsDoc(['One.'], '')).toBe('/** One. */\n');
    expect(jsDoc(['One.', '', 'Two.'], '  ')).toBe(
      '  /**\n   * One.\n   *\n   * Two.\n   */\n'
    );
  });

  it('writes nothing for blank text and cannot close the comment early', () => {
    expect(jsDoc(['', ''], '')).toBe('');
    expect(jsDoc(['a */ b'], '')).toBe('/** a *\\/ b */\n');
  });
});

describe('createTypePrinter', () => {
  it('prints scalars, literals, and enums', () => {
    const { print } = printer();

    expect(print({ type: 'string', minLength: 1 })).toBe('string');
    expect(print({ type: 'integer' })).toBe('number');
    expect(print({ type: 'boolean' })).toBe('boolean');
    expect(print({ type: 'string', const: 'a' })).toBe('"a"');
    expect(print({ type: 'string', enum: ['a', 'b'] })).toBe('"a" | "b"');
    expect(print({ enum: [1, null] })).toBe('1 | null');
    expect(print({ type: ['string', 'null'] })).toBe('string | null');
  });

  it('prints unions and intersections', () => {
    const { print } = printer();

    expect(print({ oneOf: [{ type: 'string' }, { type: 'number' }] })).toBe(
      'string | number'
    );
    expect(print({ anyOf: [{ type: 'string' }, { type: 'string' }] })).toBe(
      'string'
    );
    expect(
      print({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'string' } } },
        ],
      })
    ).toContain('} & {');
  });

  it('parenthesizes a union inside an array', () => {
    const { print } = printer();

    expect(
      print({
        type: 'array',
        items: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      })
    ).toBe('(string | number)[]');
  });

  it('keeps the parentheses of a union that deduplication reduces to one', () => {
    const { print } = printer();
    const inner = { oneOf: [{ type: 'string' }, { type: 'number' }] };

    expect(print({ type: 'array', items: { oneOf: [inner, inner] } })).toBe(
      '(string | number)[]'
    );
  });

  it('prints tuples and untyped arrays', () => {
    const { print } = printer();

    expect(
      print({
        type: 'array',
        prefixItems: [{ type: 'string' }, { type: 'number' }],
        minItems: 2,
        items: { type: 'boolean' },
      })
    ).toBe('[string, number, ...boolean[]]');
    expect(print({ type: 'array' })).toBe('unknown[]');
  });

  it('prints objects with optional members, JSDoc, and quoted keys', () => {
    const { print } = printer();

    expect(
      print({
        type: 'object',
        properties: {
          a: { type: 'string', description: 'The a.', default: 'x' },
          'b-c': { type: 'number' },
        },
        required: ['a'],
        additionalProperties: false,
      })
    ).toBe(
      [
        '{',
        '  /**',
        '   * The a.',
        '   * @default "x"',
        '   */',
        '  a: string;',
        '  "b-c"?: number;',
        '}',
      ].join('\n')
    );
  });

  it('prints records and index signatures', () => {
    const { print } = printer();

    expect(print({ type: 'object', additionalProperties: false })).toBe(
      '{\n  [key: string]: never;\n}'
    );
    expect(print({ type: 'object' })).toBe('{\n  [key: string]: unknown;\n}');
    expect(
      print({ type: 'object', additionalProperties: { type: 'number' } })
    ).toBe('{\n  [key: string]: number;\n}');
    expect(
      print({
        type: 'object',
        properties: { a: { type: 'string' } },
        additionalProperties: {},
      })
    ).toContain('[key: string]: unknown;');
  });

  it('refers to a named def and inlines an anonymous one', () => {
    const { print } = printer(
      {
        tone: { type: 'string', enum: ['a'] },
        __schema1: { type: 'array', items: { type: 'string' } },
      },
      [['tone', 'Tone']]
    );

    expect(print({ $ref: '#/$defs/tone' })).toBe('Tone');
    expect(print({ $ref: '#/$defs/__schema1' })).toBe('string[]');
  });

  it('keeps one type when a $ref and its siblings print alike', () => {
    const { print } = printer({
      __schema1: { type: 'array', items: { type: 'string' } },
    });

    expect(
      print({
        $ref: '#/$defs/__schema1',
        type: 'array',
        items: { type: 'string' },
        description: 'Rows.',
      })
    ).toBe('string[]');
  });

  it('intersects a $ref with siblings that differ', () => {
    const { print } = printer({}, [['base', 'Base']]);

    expect(
      print({
        $ref: '#/$defs/base',
        type: 'object',
        properties: { a: { type: 'string' } },
      })
    ).toBe('Base & {\n  a?: string;\n  [key: string]: unknown;\n}');
  });

  it('falls back to unknown for what it cannot express', () => {
    const { print } = printer();

    expect(print({})).toBe('unknown');
    expect(print({ not: { type: 'string' } })).toBe('unknown');
    expect(print({ $ref: '#/$defs/missing' })).toBe('unknown');
    expect(print({ const: { a: 1 } })).toBe('unknown');
    expect(print(true)).toBe('unknown');
    expect(print(false)).toBe('never');
  });

  it('names an anonymous def that refers to itself instead of looping', () => {
    const { print, promoted } = printer({
      __schema1: {
        type: 'object',
        properties: {
          children: { type: 'array', items: { $ref: '#/$defs/__schema1' } },
        },
      },
    });

    expect(print({ $ref: '#/$defs/__schema1' })).toContain(
      'children?: Schema1Alias[];'
    );
    expect(promoted()).toHaveLength(1);
    expect(promoted()[0]).toContain('type Schema1Alias = {');
  });

  it('does not read an inherited name as a def', () => {
    const { print } = printer();

    expect(print({ $ref: '#/$defs/constructor' })).toBe('unknown');
  });
});
