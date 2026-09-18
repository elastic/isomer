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
  createCompositionParser,
  createCompositionValidator,
} from './validation';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => '',
};

const kpi = definePrimitive({
  type: 'kpi',
  catalog: {
    type: 'kpi',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'kpi', label: 'a' },
  },
  examples: [{ type: 'kpi', label: 'a' }],
  schema: z.object({
    type: z.literal('kpi'),
    label: z.string(),
    delta: z.number().optional(),
  }),
  renderers,
});

const loose = definePrimitive({
  type: 'loose',
  catalog: {
    type: 'loose',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'loose' },
  },
  examples: [{ type: 'loose' }],
  schema: z.looseObject({ type: z.literal('loose') }),
  renderers,
});

const definitions = [kpi, loose];
const validate = createCompositionValidator(definitions);
const parse = createCompositionParser(definitions);

describe('validation messages', () => {
  it('names a missing required field', () => {
    expect(validate({ type: 'view', body: [{ type: 'kpi' }] }).errors).toEqual([
      { path: 'body[0].label', message: 'is required' },
    ]);
  });

  it('reports a wrong type as a type error, not a missing field', () => {
    const { errors } = validate({
      type: 'view',
      body: [{ type: 'kpi', label: 'a', delta: 'x' } as never],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.path).toBe('body[0].delta');
    expect(errors[0]?.message).not.toBe('is required');
  });

  it('reports a non-object root without claiming a field is missing', () => {
    const { errors } = parse(null);
    expect(errors).toHaveLength(1);
    expect(errors[0]).not.toEqual({ path: '', message: 'is required' });
  });

  it('words size and discriminator failures without Zod boilerplate', () => {
    const strict = definePrimitive({
      ...kpi,
      type: 'strict',
      schema: z.object({ type: z.literal('strict'), label: z.string().min(1) }),
    });
    const check = createCompositionParser([strict]);
    expect(
      check({ type: 'view', body: [{ type: 'strict', label: '' }] }).errors
    ).toEqual([{ path: 'body[0].label', message: 'must not be empty' }]);
    expect(check({ type: 'view', body: [{ type: 'nope' }] }).errors).toEqual([
      { path: 'body[0].type', message: 'must be one of: strict' },
    ]);
  });

  it('always reports warnings, empty when there are none', () => {
    const body = [{ type: 'kpi', label: 'a' }];
    expect(validate({ type: 'view', body }).warnings).toEqual([]);
  });
});

describe('unknown node keys', () => {
  it('rejects an unknown key on a node, matching the root and the JSON Schema', () => {
    const { valid, errors } = parse({
      type: 'view',
      body: [{ type: 'kpi', label: 'a', hallucinated: true }],
    });
    expect(valid).toBe(false);
    expect(errors).toEqual([
      { path: 'body[0]', message: 'has unrecognized key(s): hallucinated' },
    ]);
  });

  it('keeps an explicitly loose schema loose', () => {
    const result = parse({
      type: 'view',
      body: [{ type: 'loose', extra: 1 }],
    });
    expect(result.valid).toBe(true);
    expect(result.composition?.body[0]).toEqual({ type: 'loose', extra: 1 });
  });
});
