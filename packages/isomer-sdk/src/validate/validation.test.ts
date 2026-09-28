/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../composition/composition';
import { formatValidationError } from '../composition/validation_error';
import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';
import { formatPath, formatZodIssue } from '../define/zod_format';
import { fixtureDefinitions } from '../testing/sdk.fixtures';

import {
  createCompositionParser,
  createCompositionValidator,
  MAX_COMPOSITION_DEPTH,
  MAX_COMPOSITION_VALUES,
  MAX_VALIDATION_ERRORS,
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
  it('names the primitive an error lands in, and prints it', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'kpi' }] }).errors;
    expect(error && formatValidationError(error)).toBe(
      'body[0].label (in kpi) is required'
    );
  });

  it('suggests the type a misspelling is closest to', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'kpl' }] }).errors;
    expect(error?.message).toMatch(
      /^is "kpl"; did you mean "kpi"\? It must be one of:/
    );
  });

  it('suggests nothing for a long value, even against an equally long option', () => {
    const issue = z
      .object({ type: z.literal('k'.repeat(100_000)) })
      .safeParse({ type: 'j'.repeat(100_000) }, { reportInput: true }).error
      ?.issues[0];
    const started = performance.now();
    expect(formatZodIssue(issue!).message).toMatch(/^must be one of:/);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('formats a BigInt option and input without throwing', () => {
    const issue = z.object({ n: z.literal(1n) }).safeParse({ n: 2n }).error
      ?.issues[0];
    expect(formatZodIssue(issue!)).toMatchObject({
      path: 'n',
      message: 'must be one of: 1n',
    });
  });

  it('suggests nothing for a value far longer than every option', () => {
    const [error] = validate({
      type: 'view',
      body: [{ type: 'k'.repeat(100_000) }],
    }).errors;
    expect(error?.message).toMatch(/^must be one of:/);
  });

  it('names the node an error lands in, not a nested data object that shares a type', () => {
    const card = definePrimitive({
      type: 'card',
      catalog: {
        type: 'card',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'card', source: { type: 'kpi', count: 1 } },
      },
      examples: [{ type: 'card', source: { type: 'kpi', count: 1 } }],
      schema: z.object({
        type: z.literal('card'),
        source: z.object({ type: z.string(), count: z.number() }),
      }),
      renderers,
    });
    const [error] = createCompositionValidator([kpi, card])({
      type: 'view',
      body: [{ type: 'card', source: { type: 'kpi', count: 'x' } } as never],
    }).errors;
    expect(error).toMatchObject({
      path: 'body[0].source.count',
      nodeType: 'card',
    });
  });

  it('leaves an unknown type unnamed', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'nope' }] }).errors;
    expect(error?.nodeType).toBeUndefined();
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
          'has unrecognized key(s): "hallucinated"; its fields are label, delta',
        nodeType: 'kpi',
      },
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

const LINE_SEPARATOR = String.fromCharCode(0x2028);

describe('messages that list schema names', () => {
  it('quotes a node type that is not a plain name where an error names it', () => {
    expect(
      formatValidationError({
        path: 'body[0]',
        message: 'is required',
        nodeType: 'kpi',
      })
    ).toBe('body[0] (in kpi) is required');
    expect(
      formatValidationError({
        path: 'body[0]',
        message: 'is required',
        nodeType: 'a\nb',
      })
    ).toBe('body[0] (in "a\\nb") is required');
  });

  it('quotes an option or field name that is not a plain name, and keeps each on one line', () => {
    const schema = z.object({
      type: z.literal('view'),
      mode: z.enum(['plain', 'line\nfeed', 'say "hi"', 'sep\u2028x']),
    });
    const [issue] = schema.safeParse({ type: 'view', mode: 'x' }).error!.issues;
    const { message } = formatZodIssue(issue!);
    expect(message).not.toMatch(/[\n\u2028]/);
    expect(message).toBe(
      'must be one of: plain, "line\\nfeed", "say \\"hi\\"", "sep\\u2028x"'
    );
  });
});

describe('messages that echo input', () => {
  it('quotes a misspelled value as JSON', () => {
    const [error] = validate({ type: 'view', body: [{ type: 'kp"' }] }).errors;
    expect(error?.message).toMatch(/^is "kp\\""; did you mean "kpi"\?/);
  });

  it('quotes unknown keys on one line, and lists only the first few', () => {
    const keys = Array.from({ length: 12 }, (_, index) =>
      index === 0 ? `a${LINE_SEPARATOR}b` : `extra${index}`
    );
    const [error] = parse({
      type: 'view',
      body: [
        {
          type: 'kpi',
          label: 'a',
          ...Object.fromEntries(keys.map((key) => [key, 1])),
        },
      ],
    }).errors;
    expect(error?.message).toContain('"a\\u2028b", "extra1"');
    expect(error?.message).toContain('and 2 more');
    expect(error?.message).not.toContain(LINE_SEPARATOR);
  });

  it('quotes a duplicated id on one line', () => {
    const id = `a${LINE_SEPARATOR}b`;
    const [error] = validate({
      type: 'view',
      body: [
        { type: 'kpi', label: 'a', id } as PrimitiveNode,
        { type: 'kpi', label: 'b', id } as PrimitiveNode,
      ],
    }).errors;
    expect(error?.message).toBe(
      'duplicates id "a\\u2028b" first used at body[0]'
    );
  });

  it('quotes a path key that is not a plain name', () => {
    expect(formatPath(['body', 0, 'a b', `x${LINE_SEPARATOR}`, 'ok-key'])).toBe(
      'body[0]["a b"]["x\\u2028"].ok-key'
    );
  });
});

describe('input bounds', () => {
  const boundedValidate = createCompositionValidator(fixtureDefinitions);
  const boundedParse = createCompositionParser(fixtureDefinitions);
  /** A view whose one body node is `depth` stacks around a note. */
  const stacked = (depth: number): Composition => {
    let node: PrimitiveNode = { type: 'note', body: 'leaf' } as PrimitiveNode;
    for (let level = 0; level < depth; level += 1) {
      node = { type: 'stack', items: [node] } as PrimitiveNode;
    }
    return { type: 'view', body: [node] };
  };

  it.each([500, 5000])(
    'reports a composition %i stacks deep instead of throwing',
    (depth) => {
      for (const { valid, errors } of [
        boundedParse(stacked(depth)),
        boundedValidate(stacked(depth)),
      ]) {
        expect(valid).toBe(false);
        expect(errors).toEqual([
          {
            path: '',
            message: `nests deeper than ${MAX_COMPOSITION_DEPTH} levels of arrays and objects`,
          },
        ]);
      }
    }
  );

  it('accepts a composition as deep as the bound allows', () => {
    // The view, its body, and two levels per stack sit above the leaf.
    const deepest = stacked(Math.floor((MAX_COMPOSITION_DEPTH - 3) / 2));
    expect(boundedParse(deepest).valid).toBe(true);
    expect(boundedValidate(deepest).valid).toBe(true);
  });

  it('reports a composition with more values than the bound allows', () => {
    const { valid, errors } = boundedParse({
      type: 'view',
      body: Array.from({ length: MAX_COMPOSITION_VALUES }, () => ({
        type: 'note',
        body: 'x',
      })),
    });
    expect(valid).toBe(false);
    expect(errors).toEqual([
      {
        path: '',
        message: `holds more than ${MAX_COMPOSITION_VALUES} values`,
      },
    ]);
  });

  it('lists the first duplicate ids and counts the rest', () => {
    const { errors } = boundedValidate({
      type: 'view',
      body: Array.from(
        { length: MAX_VALIDATION_ERRORS + 151 },
        () => ({ type: 'note', id: 'same', body: 'x' }) as PrimitiveNode
      ),
    });
    expect(errors).toHaveLength(MAX_VALIDATION_ERRORS + 1);
    expect(errors.at(-1)).toEqual({
      path: '',
      message: 'and 150 more errors not listed',
    });
  });

  it('counts an array’s extra enumerable properties toward the value bound', () => {
    const body = [] as unknown as Record<string, number>;
    for (let index = 0; index < MAX_COMPOSITION_VALUES + 10; index += 1) {
      body[`k${index}`] = index;
    }
    expect(boundedParse({ type: 'view', body }).errors).toEqual([
      {
        path: '',
        message: `holds more than ${MAX_COMPOSITION_VALUES} values`,
      },
    ]);
  });

  it('refuses a cyclic value instead of walking it forever', () => {
    const cyclic: Record<string, unknown> = { type: 'view', body: [] };
    (cyclic.body as unknown[]).push(cyclic);
    for (const { valid, errors } of [
      boundedParse(cyclic),
      boundedValidate(cyclic as unknown as Composition),
    ]) {
      expect(valid).toBe(false);
      expect(errors).toEqual([
        {
          path: '',
          message: `nests deeper than ${MAX_COMPOSITION_DEPTH} levels of arrays and objects`,
        },
      ]);
    }
  });

  it('lists the first errors and counts the rest', () => {
    const { errors } = boundedParse({
      type: 'view',
      body: Array.from({ length: MAX_VALIDATION_ERRORS + 150 }, () => ({
        type: 'note',
      })),
    });
    expect(errors).toHaveLength(MAX_VALIDATION_ERRORS + 1);
    expect(errors.at(-2)).toMatchObject({ message: 'is required' });
    expect(errors.at(-1)).toEqual({
      path: '',
      message: 'and 150 more errors not listed',
    });
  });
});
