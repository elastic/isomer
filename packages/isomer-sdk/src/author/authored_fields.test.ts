/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z, type ZodType } from 'zod';

import { definePrimitive } from '../define/primitive_module';

import {
  authoredChild,
  type AuthoredChildBrand,
  fromChildren,
  readAuthoredSpec,
} from './authored_fields';

type Assert<T extends true> = T;

interface CellProps {
  width?: string;
  children?: ReactNode;
}

const rowSchemaFor = (bodyNodeSchema: ZodType) =>
  z.object({
    type: z.literal('row'),
    items: fromChildren(
      'cell',
      z
        .array(z.object({ width: z.string().optional(), node: bodyNodeSchema }))
        .min(1),
      {
        toItem({ width, children }: CellProps, { parseChildren }) {
          return {
            width,
            node: parseChildren(children)[0] ?? { type: 'note' },
          };
        },
      }
    ),
  });

const defined = definePrimitive({
  type: 'row' as const,
  catalog: {
    type: 'row',
    purpose: 'Lay out cells.',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'row', items: [] },
  },
  examples: [{ type: 'row' as const, items: [{ node: { type: 'note' } }] }],
  schema: rowSchemaFor(z.object({ type: z.string() })),
  renderers: {
    react: () => null,
    text: () => '',
    markdown: () => [],
  },
});

type DefinedItems = (typeof defined.schema)['shape']['items'];
type RecoveredProps =
  DefinedItems extends AuthoredChildBrand<string, infer Props> ? Props : never;

type _BrandSurvivesDefinePrimitive = Assert<
  [RecoveredProps] extends [CellProps]
    ? [CellProps] extends [RecoveredProps]
      ? true
      : false
    : false
>;

interface HandOptional {
  label?: string;
}

const optionalSchema = z.object({
  type: z.literal('badge'),
  label: z.string().optional(),
});
const exactSchema = z.object({
  type: z.literal('badge'),
  label: z.string().exactOptional(),
});

type _HandAssignableToOptional = Assert<
  [HandOptional & { type: 'badge' }] extends [z.infer<typeof optionalSchema>]
    ? true
    : false
>;
type _ExactMatchesHand = Assert<
  [HandOptional & { type: 'badge' }] extends [z.infer<typeof exactSchema>]
    ? [z.infer<typeof exactSchema>] extends [HandOptional & { type: 'badge' }]
      ? true
      : false
    : false
>;

describe('fromChildren', () => {
  it('keeps the child brand on the field through definePrimitive', () => {
    const items = defined.schema.shape.items as { [authoredChild]?: string };
    expect(items[authoredChild]).toBe('cell');
    expectTypeOf<RecoveredProps>().toEqualTypeOf<CellProps>();
  });

  it('leaves z.infer of a branded field as the schema output', () => {
    const schema = z.object({
      items: fromChildren(
        'badge',
        z.array(z.object({ label: z.string() })).min(1)
      ),
    });
    expect(schema.parse({ items: [{ label: 'Open' }] }).items).toEqual([
      { label: 'Open' },
    ]);
    expectTypeOf<z.infer<typeof schema>['items'][number]>().toEqualTypeOf<{
      label: string;
    }>();
  });

  it('keeps omitted optionals assignable, and exactOptional mutually so', () => {
    expect(optionalSchema.parse({ type: 'badge' })).toEqual({ type: 'badge' });
    expect(optionalSchema.parse({ type: 'badge', label: undefined })).toEqual({
      type: 'badge',
    });
    expect(exactSchema.parse({ type: 'badge' })).toEqual({ type: 'badge' });
    expectTypeOf<HandOptional & { type: 'badge' }>().toMatchTypeOf<
      z.infer<typeof optionalSchema>
    >();
  });
});

describe('custom child input schemas', () => {
  it('infers the callback and phantom child props from the input schema', () => {
    const propsSchema = z.strictObject({
      title: z.string(),
      count: z.number().default(1),
    });
    const items = fromChildren(
      'schemaCard',
      z.array(z.object({ label: z.string() })),
      {
        propsSchema,
        toItem(props) {
          expectTypeOf(props.title).toEqualTypeOf<string>();
          expectTypeOf(props.count).toEqualTypeOf<number | undefined>();
          return { label: props.title };
        },
      }
    );
    type Props =
      typeof items extends AuthoredChildBrand<'schemaCard', infer Input>
        ? Input
        : never;
    expectTypeOf<Props>().toEqualTypeOf<
      z.input<typeof propsSchema> & { children?: ReactNode }
    >();
    const object = z.object({ items });
    expect(readAuthoredSpec(object).children[0]?.propsSchema).toBe(propsSchema);
    expect(() =>
      fromChildren('schemaCard', items, {
        propsSchema: z.strictObject({ title: z.number() }),
        toItem: ({ title }) => ({ label: String(title) }),
      })
    ).toThrow(expect.objectContaining({ code: 'AUTHORED_SCHEMA_REUSED' }));
  });
});

describe('authored child schema signatures', () => {
  const signature = (schema: ZodType, custom: boolean) =>
    readAuthoredSpec(
      z.object({
        items: custom
          ? fromChildren('item', z.array(z.object({ label: z.string() })), {
              propsSchema: schema,
              toItem: () => ({ label: 'ok' }),
            })
          : fromChildren('item', z.array(schema)),
      })
    ).children[0]?.signature;

  it.each([
    ['literals', z.literal('first'), z.literal('second')],
    ['enums', z.enum(['first', 'second']), z.enum(['first', 'third'])],
    [
      'unions',
      z.union([z.string(), z.number()]),
      z.union([z.string(), z.boolean()]),
    ],
    [
      'tuples',
      z.tuple([z.string(), z.number()]),
      z.tuple([z.number(), z.string()]),
    ],
    [
      'records',
      z.record(z.string(), z.string()),
      z.record(z.string(), z.number()),
    ],
    [
      'catchalls',
      z.object({}).catchall(z.string()),
      z.object({}).catchall(z.number()),
    ],
  ])(
    'distinguishes %s in both item and custom props schemas',
    (_label, first, second) => {
      for (const custom of [false, true]) {
        expect(signature(first as ZodType, custom)).not.toBe(
          signature(second as ZodType, custom)
        );
      }
    }
  );

  it('ignores schema sharing, property order, and documentation', () => {
    const shared = z.string();
    const first = z
      .object({ first: shared, second: shared })
      .describe('First.');
    const second = z
      .object({ second: z.string(), first: z.string() })
      .describe('Second.');
    for (const custom of [false, true]) {
      expect(signature(first, custom)).toBe(signature(second, custom));
    }
  });

  it('matches separately allocated recursive schemas', () => {
    const tree = () => {
      const schema = z.object({
        label: z.string(),
        get children(): z.ZodOptional<z.ZodArray<ZodType>> {
          return z.array(schema).optional();
        },
      });
      return schema;
    };
    for (const custom of [false, true]) {
      expect(signature(tree(), custom)).toBe(signature(tree(), custom));
    }
  });

  it('ignores generated reference names when recursive properties are reordered', () => {
    const tree = (value: ZodType) => {
      const schema = z.object({
        value,
        get next(): z.ZodOptional<ZodType> {
          return schema.optional();
        },
      });
      return schema;
    };
    const first = z.object({
      first: tree(z.string()),
      second: tree(z.number()),
    });
    const second = z.object({
      second: tree(z.number()),
      first: tree(z.string()),
    });
    for (const custom of [false, true]) {
      expect(signature(first, custom)).toBe(signature(second, custom));
    }
  });

  it.each(['default', 'prefault', 'catch'] as const)(
    'does not execute %s callbacks while comparing input schemas',
    (wrapper) => {
      let calls = 0;
      const schema = z.object({
        value: z.string()[wrapper](() => `value-${++calls}`),
      });
      for (const custom of [false, true]) {
        expect(signature(schema, custom)).toBe(signature(schema, custom));
      }
      expect(calls).toBe(0);
      expect(
        schema.parse({ value: wrapper === 'catch' ? 42 : undefined })
      ).toEqual({ value: 'value-1' });
      expect(calls).toBe(1);
    }
  );

  it('does not execute nested or recursive fallback callbacks', () => {
    const fail = () => {
      throw new Error('fallback executed');
    };
    const tree = z.object({
      value: z.string().default(fail),
      get next(): z.ZodOptional<ZodType> {
        return tree.optional();
      },
    });
    const schema = z
      .object({
        tuple: z.tuple([z.string().prefault(fail), z.number().catch(fail)]),
        choices: z.union([z.string().default(fail), z.number().catch(fail)]),
        record: z.record(z.string(), z.string().default(fail)),
        tree,
      })
      .catchall(z.string().catch(fail));
    for (const custom of [false, true]) {
      expect(() => signature(schema, custom)).not.toThrow();
    }
  });
});
