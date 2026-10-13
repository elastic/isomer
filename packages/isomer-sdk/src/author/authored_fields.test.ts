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
