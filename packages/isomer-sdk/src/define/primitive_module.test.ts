/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { PrimitivePack } from '../pack/primitive_pack';

import {
  type DefaultPackTypes,
  definePrimitive,
  definePrimitiveFor,
  type PrimitiveCatalogEntry,
  type SurfaceMap,
} from './primitive_module';
import type { SlackBlock } from './slack_blocks';

interface WideTheme {
  text: string;
  background: string;
}

interface NarrowTheme {
  text: string;
}

const assertThemeBound = (wide: PrimitivePack<WideTheme>): void => {
  // @ts-expect-error a pack needing a richer palette must not fit a narrower slot
  const narrow: PrimitivePack<NarrowTheme> = wide;
  void narrow;
};

describe('PrimitivePack theme bound', () => {
  it('rejects a pack that needs a richer palette than the slot supplies', () => {
    expect(assertThemeBound).toEqual(expect.any(Function));
  });
});

describe('SurfaceMap slack payload', () => {
  it('defaults the slack payload type to Block Kit', () => {
    expectTypeOf<SurfaceMap['slack']['output']>().toEqualTypeOf<
      SlackBlock | readonly SlackBlock[]
    >();
  });

  it('binds a slack payload type when one is supplied', () => {
    interface DividerPack extends DefaultPackTypes {
      slackBlock: { type: 'divider' };
    }
    expectTypeOf<SurfaceMap<DividerPack>['slack']['output']>().toEqualTypeOf<
      { type: 'divider' } | readonly { type: 'divider' }[]
    >();
  });
});

const primitiveWith = (schema: z.ZodObject) =>
  definePrimitive({
    type: 'probe',
    catalog: {
      type: 'probe',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: { type: 'probe' },
    },
    examples: [{ type: 'probe' }],
    schema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });

describe('definePrimitive node fields', () => {
  it('adds an optional id and surfaces to a closed schema', () => {
    const { schema } = primitiveWith(z.object({ type: z.literal('probe') }));
    expect(
      schema.safeParse({ type: 'probe', id: 'a', surfaces: ['text'] }).success
    ).toBe(true);
    expect(schema.safeParse({ type: 'probe', extra: 1 }).success).toBe(false);
  });

  it('keeps a loose schema loose', () => {
    const { schema } = primitiveWith(
      z.looseObject({ type: z.literal('probe') })
    );
    expect(schema.safeParse({ type: 'probe', extra: 1 }).success).toBe(true);
  });

  it('rejects id or surfaces in a container schemaFor result', () => {
    for (const field of ['id', 'surfaces']) {
      const container = definePrimitive({
        type: 'probe',
        catalog: {
          type: 'probe',
          purpose: '',
          useWhen: [],
          avoidWhen: [],
          example: { type: 'probe' },
        },
        examples: [{ type: 'probe' }],
        schema: z.object({ type: z.literal('probe') }),
        schemaFor: () =>
          z.object({ type: z.literal('probe'), [field]: z.number() }),
        renderers: { react: () => null, text: () => '', markdown: () => [] },
      });
      expect(() => container.schemaFor?.(z.object({}))).toThrow(
        expect.objectContaining({ code: 'RESERVED_NODE_FIELD' })
      );
    }
  });

  it('accepts a schema another copy of the SDK defined', () => {
    const mark = <T extends z.ZodType>(schema: T): T =>
      Object.defineProperty(schema, Symbol.for('elastic.isomer.node_field'), {
        value: true,
      });
    const fromOtherCopy = z
      .object({
        type: z.literal('probe'),
        id: mark(z.string().optional()),
        surfaces: mark(z.array(z.string()).optional()),
      })
      .strict();
    expect(() => primitiveWith(fromOtherCopy)).not.toThrow();
  });

  it.each([
    ['extend', (s: z.ZodObject) => s.extend({ extra: z.string() })],
    ['strict', (s: z.ZodObject) => s.strict()],
    ['describe', (s: z.ZodObject) => s.describe('probe')],
    ['partial', (s: z.ZodObject) => s.partial()],
    ['partial twice', (s: z.ZodObject) => s.partial().partial()],
    ['pick', (s: z.ZodObject) => s.pick({ type: true, id: true })],
    ['omit', (s: z.ZodObject) => s.omit({ surfaces: true })],
  ])('accepts a schema derived from a defined one with %s', (_name, derive) => {
    const { schema } = primitiveWith(z.object({ type: z.literal('probe') }));
    expect(() => primitiveWith(derive(schema))).not.toThrow();
  });

  it('rejects a derived schema that redeclares a node field', () => {
    const { schema } = primitiveWith(z.object({ type: z.literal('probe') }));
    expect(() => primitiveWith(schema.extend({ id: z.number() }))).toThrow(
      expect.objectContaining({ code: 'RESERVED_NODE_FIELD' })
    );
  });

  it('accepts the schema of a primitive it already defined', () => {
    const { schema } = primitiveWith(z.object({ type: z.literal('probe') }));
    expect(() => primitiveWith(schema)).not.toThrow();
  });

  it.each(['id', 'surfaces'])('rejects a schema declaring %s', (field) => {
    expect(() =>
      primitiveWith(z.object({ type: z.literal('probe'), [field]: z.number() }))
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'RESERVED_NODE_FIELD',
      })
    );
  });
});

describe('definePrimitive icon', () => {
  const icon = {
    svg: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>',
  };
  const base = {
    type: 'probe',
    catalog: {
      type: 'probe',
      name: 'Probe',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: { type: 'probe' },
    },
    examples: [{ type: 'probe' }],
    schema: z.object({ type: z.literal('probe') }),
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  };

  it('keeps icon and catalog.name', () => {
    const defined = definePrimitive({ ...base, icon });
    expect(defined.icon).toBe(icon);
    expect(defined.catalog.name).toBe('Probe');
  });

  it('keeps icon through definePrimitiveFor', () => {
    expect(definePrimitiveFor<DefaultPackTypes>()({ ...base, icon }).icon).toBe(
      icon
    );
  });

  it('adds no icon key when none is declared', () => {
    expect(Object.hasOwn(definePrimitive(base), 'icon')).toBe(false);
  });
});

describe('catalog group', () => {
  interface ShelfPack extends DefaultPackTypes {
    groups: 'Metrics' | 'Notes';
  }

  const defineShelf = definePrimitiveFor<ShelfPack>();
  const shelf = {
    type: 'probe' as const,
    examples: [{ type: 'probe' as const }],
    schema: z.object({ type: z.literal('probe') }),
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  };

  it('leaves group optional when the pack does not close it', () => {
    expectTypeOf<PrimitiveCatalogEntry['group']>().toEqualTypeOf<
      string | undefined
    >();
  });

  it('accepts a type bag that does not declare groups', () => {
    const defineBare = definePrimitiveFor<Omit<DefaultPackTypes, 'groups'>>();
    const defined = defineBare({
      ...shelf,
      catalog: {
        type: 'probe',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
    });
    expectTypeOf(defined.catalog.group).toEqualTypeOf<string | undefined>();
  });

  it('requires a heading the pack names', () => {
    expectTypeOf<
      PrimitiveCatalogEntry<'Metrics' | 'Notes'>['group']
    >().toEqualTypeOf<'Metrics' | 'Notes'>();
  });

  it('accepts a heading the pack names', () => {
    const defined = defineShelf({
      ...shelf,
      catalog: {
        type: 'probe',
        group: 'Metrics',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
    });
    expect(defined.catalog.group).toBe('Metrics');
  });

  it('rejects a heading the pack does not name', () => {
    defineShelf({
      ...shelf,
      catalog: {
        type: 'probe',
        // @ts-expect-error a heading the pack does not name
        group: 'Other',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
    });
  });

  it('rejects a catalog that names no heading', () => {
    defineShelf({
      ...shelf,
      // @ts-expect-error a closed pack requires catalog.group
      catalog: {
        type: 'probe',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
    });
  });
});

describe('definePrimitive description', () => {
  const base = {
    type: 'probe',
    catalog: {
      type: 'probe',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: { type: 'probe' },
    },
    examples: [{ type: 'probe' }],
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  };

  it('copies a root schema description onto the catalog', () => {
    const defined = definePrimitive({
      ...base,
      schema: z
        .object({ type: z.literal('probe') })
        .describe('From the schema.'),
    });
    expect(defined.catalog.description).toBe('From the schema.');
  });

  it('keeps a catalog description over the schema one', () => {
    const catalog = { ...base.catalog, description: 'From the catalog.' };
    const defined = definePrimitive({
      ...base,
      catalog,
      schema: z
        .object({ type: z.literal('probe') })
        .describe('From the schema.'),
    });
    expect(defined.catalog).toBe(catalog);
  });

  it('adds no catalog description when none is declared', () => {
    const defined = definePrimitive({
      ...base,
      schema: z.object({ type: z.literal('probe') }),
    });
    expect(defined.catalog).toBe(base.catalog);
    expect(Object.hasOwn(defined.catalog, 'description')).toBe(false);
  });
});
