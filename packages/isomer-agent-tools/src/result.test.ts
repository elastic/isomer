/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { jsonResult } from './result';

describe('jsonResult', () => {
  it('prints a value as indented JSON', () => {
    expect(jsonResult({ valid: true })).toEqual({
      content: [{ type: 'text', text: '{\n  "valid": true\n}' }],
    });
  });

  it.each([
    ['undefined', undefined],
    ['a function', () => 1],
    ['a symbol', Symbol('x')],
    ['a toJSON that returns undefined', { toJSON: () => undefined }],
  ])('prints %s as null, keeping isError', (_label, value) => {
    expect(jsonResult(value)).toEqual({
      content: [{ type: 'text', text: 'null' }],
    });
    expect(jsonResult(value, true)).toEqual({
      content: [{ type: 'text', text: 'null' }],
      isError: true,
    });
  });

  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;

  it.each([
    ['a BigInt', { count: 1n }, /BigInt/],
    ['a cycle', cycle, /circular/i],
    [
      'a throwing toJSON',
      {
        toJSON: () => {
          throw new Error('no JSON here');
        },
      },
      /^no JSON here$/,
    ],
  ])('returns %s as a failed result', (_label, value, message) => {
    const { content, isError } = jsonResult(value);
    expect(isError).toBe(true);
    expect(content).toHaveLength(1);
    const [block] = content;
    expect(block?.type === 'text' ? block.text : undefined).toMatch(message);
  });
});
