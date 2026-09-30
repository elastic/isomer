/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';

import { formatValidationError } from '../composition/validation_error';
import {
  definePrimitive,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';

import {
  createCompositionParser,
  createCompositionValidator,
  enforceValidationMode,
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

const holder = definePrimitive({
  type: 'holder',
  catalog: {
    type: 'holder',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'holder', items: [] },
  },
  examples: [{ type: 'holder', items: [] }],
  schema: z.object({
    type: z.literal('holder'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({ type: z.literal('holder'), items: z.array(bodyNodeSchema) }),
  children: ({ items }) =>
    items.map((node, index) => ({ node, path: `items[${index}]` })),
  renderers,
});

const definitions = [kpi, loose, holder];
const validate = createCompositionValidator(definitions);
const parse = createCompositionParser(definitions);

describe('validation messages', () => {
  it('names a missing required field', () => {
    expect(validate({ type: 'view', body: [{ type: 'kpi' }] }).errors).toEqual([
      { path: 'body[0].label', message: 'is required', nodeType: 'kpi' },
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
    ).toEqual([
      {
        path: 'body[0].label',
        message: 'must not be empty',
        nodeType: 'strict',
      },
    ]);
    expect(check({ type: 'view', body: [{ type: 'nope' }] }).errors).toEqual([
      { path: 'body[0].type', message: 'must be one of: strict' },
    ]);
  });

  it('always reports warnings, empty when there are none', () => {
    const body = [{ type: 'kpi', label: 'a' }];
    expect(validate({ type: 'view', body }).warnings).toEqual([]);
  });
});

describe('error node types', () => {
  it('prints the primitive an error lands in', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'kpi' }] }).errors;
    expect(error && formatValidationError(error)).toBe(
      'body[0].label (in kpi) is required'
    );
  });

  it('names the innermost primitive, not its container', () => {
    const { errors } = parse({
      type: 'view',
      body: [{ type: 'holder', items: [{ type: 'kpi', label: 'a', x: 1 }] }],
    });
    expect(errors.map(formatValidationError)).toEqual([
      'body[0].items[0] (in kpi) has unrecognized key(s): x; its fields are label, delta',
    ]);
  });

  it('names the container for an error in its own fields', () => {
    const { errors } = parse({
      type: 'view',
      body: [{ type: 'holder', items: 'none' }],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      path: 'body[0].items',
      nodeType: 'holder',
    });
  });

  it('leaves an unknown type unnamed', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'nope' }] }).errors;
    expect(error?.nodeType).toBeUndefined();
  });

  it.each([{ type: 'nope' }, { type: 5 }])(
    'leaves a nested child of unknown type %j unnamed, not its container',
    (child) => {
      const { errors } = parse({
        type: 'view',
        body: [{ type: 'holder', items: [child] }],
      });
      expect(errors).not.toHaveLength(0);
      for (const error of errors) {
        expect(error.path).toMatch(/^body\[0\]\.items\[0\]/);
        expect(error).not.toHaveProperty('nodeType');
      }
    }
  );

  it('names the container for a child slot that holds no node', () => {
    const [error] = parse({
      type: 'view',
      body: [{ type: 'holder', items: [5] }],
    }).errors;
    expect(error).toMatchObject({
      path: 'body[0].items[0]',
      nodeType: 'holder',
    });
  });

  it('prints a root finding unchanged', () => {
    const [error] = parse(null).errors;
    expect(error?.nodeType).toBeUndefined();
    expect(error && formatValidationError(error)).toBe(error?.message);
  });

  it('names the primitive a duplicate id lands on', () => {
    const { errors } = validate({
      type: 'view',
      body: [
        { type: 'kpi', id: 'a', label: 'a' } as never,
        {
          type: 'holder',
          items: [{ type: 'kpi', id: 'a', label: 'b' }],
        } as never,
      ],
    });
    expect(errors.map(formatValidationError)).toEqual([
      'body[1].items[0].id (in kpi) duplicates id "a" first used at body[0]',
    ]);
  });

  it('quotes a type that is not a plain name', () => {
    expect(
      formatValidationError({
        path: 'body[0].label',
        message: 'is required',
        nodeType: 'my kpi',
      })
    ).toBe('body[0].label (in "my kpi") is required');
  });

  it('keeps echoed names on one line', () => {
    const odd = definePrimitive({
      ...kpi,
      type: 'odd\u2028type',
      schema: z.object({
        type: z.literal('odd\u2028type'),
        'line\nfield': z.string().optional(),
      }),
    });
    const check = createCompositionValidator([odd]);
    const { errors } = check({
      type: 'view',
      body: [
        { type: 'odd\u2028type', 'key\u2029x': 1 } as never,
        { type: 'odd\u2028type', id: 'a\u2028' },
      ],
    });
    const lines = errors.map(formatValidationError);
    expect(lines).toEqual([
      'body[0] (in "odd\\u2028type") has unrecognized key(s): "key\\u2029x"; its fields are "line\\nfield"',
    ]);
    const [duplicate] = check({
      type: 'view',
      body: [
        { type: 'odd\u2028type', id: 'a\u2028' },
        { type: 'odd\u2028type', id: 'a\u2028' },
      ],
    }).errors;
    expect(duplicate && formatValidationError(duplicate)).not.toMatch(
      /[\n\r\u2028\u2029]/
    );
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
      {
        path: 'body[0]',
        message:
          'has unrecognized key(s): hallucinated; its fields are label, delta',
        nodeType: 'kpi',
      },
    ]);
  });

  it('says so when a node declares no fields of its own', () => {
    const bare = definePrimitive({
      ...kpi,
      type: 'bare',
      schema: z.object({ type: z.literal('bare') }),
    });
    const { errors } = createCompositionParser([bare])({
      type: 'view',
      body: [{ type: 'bare', extra: 1 }],
    });
    expect(errors.map(formatValidationError)).toEqual([
      'body[0] (in bare) has unrecognized key(s): extra; it declares no fields',
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

describe('the input budget', () => {
  const deep = (depth: number) => {
    let node: unknown = { type: 'kpi', label: 'a' };
    for (let level = 0; level < depth; level += 1) {
      node = { type: 'holder', items: [node] };
    }
    return { type: 'view', body: [node] };
  };
  const refusal = {
    valid: false,
    errors: [
      {
        path: '',
        message: 'input nests deeper than 64 levels',
        code: 'INPUT_OVER_BUDGET',
      },
    ],
  };

  it('refuses a 100,000-deep body before the schema recurses', () => {
    expect(parse(deep(100_000))).toEqual(refusal);
    expect(validate(deep(100_000) as never)).toEqual({
      ...refusal,
      warnings: [],
    });
  });

  it('refuses a container inherited past the walk', () => {
    const [node] = deep(100_000).body;
    const smuggled = { type: 'view', body: [Object.create(node as object)] };
    expect(parse(smuggled).errors[0]?.code).toBe('INPUT_NOT_PLAIN_DATA');
  });

  it('takes a host override', () => {
    const budget = { inputBudget: { depth: 4 } };
    expect(parse(deep(1)).valid).toBe(true);
    expect(createCompositionParser(definitions, budget)(deep(1)).valid).toBe(
      false
    );
    expect(
      createCompositionValidator(definitions, budget)(deep(1) as never).valid
    ).toBe(false);
  });

  it('throws an over-budget result even when collecting', () => {
    const result = validate(deep(100) as never);
    expect(() => enforceValidationMode(result, 'collect')).toThrow(
      expect.objectContaining({
        name: 'CompositionValidationError',
        code: 'COMPOSITION_INVALID',
        errors: result.errors,
      })
    );
    const invalid = validate({
      type: 'view',
      body: [{ type: 'kpi' }],
    } as never);
    expect(() => enforceValidationMode(invalid, 'collect')).not.toThrow();
  });
});
