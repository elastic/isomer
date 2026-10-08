/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import {
  type AnyPrimitiveDefinition,
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';

import type { EnhancementDefinition } from './enhancements';
import { definePrimitivePack, type PrimitivePack } from './primitive_pack';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => [],
};

const leaf = (type: string, group?: string) =>
  definePrimitive<PrimitiveNode>({
    type,
    catalog: {
      type,
      ...(group === undefined ? {} : { group }),
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: z.object({ type: z.literal(type) }),
    renderers,
  });

const caught = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
};

const enhancement = (id: string): EnhancementDefinition => ({
  id,
  appliesTo: () => true,
  script: '',
});

describe('definePrimitivePack', () => {
  it('rejects an empty inventory', () => {
    expect(() =>
      definePrimitivePack({ id: 'empty', surfaces: [], primitives: [] })
    ).toThrow('at least one primitive is required');
  });

  it('identifies pack construction failures by name and code', () => {
    try {
      definePrimitivePack({ id: 'empty', surfaces: [], primitives: [] });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'EMPTY_PACK',
      });
    }
  });

  it('defaults surfaces to empty when the pack declares none', () => {
    const pack = definePrimitivePack({
      id: 'notes',
      primitives: [leaf('note')],
    });
    expect(pack.surfaces).toEqual([]);
  });

  it('rejects duplicate enhancement ids', () => {
    expect(() =>
      definePrimitivePack({
        id: 'dup',
        surfaces: [],
        primitives: [leaf('note')],
        enhancements: [enhancement('tableSort'), enhancement('tableSort')],
      })
    ).toThrow('primitive pack "dup": enhancement "tableSort" registered twice');
  });

  it('rejects a node type registered twice', () => {
    expect(() =>
      definePrimitivePack({
        id: 'dup',
        primitives: [leaf('note'), leaf('note')],
      })
    ).toThrow('primitive pack "dup": primitive type "note" registered twice');
    try {
      definePrimitivePack({
        id: 'dup',
        primitives: [leaf('note'), leaf('note')],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'DUPLICATE_PRIMITIVE_TYPE',
      });
    }
  });

  it('does not require a slack renderer when the pack declares slack', () => {
    expect(() =>
      definePrimitivePack({
        id: 'chat',
        surfaces: ['slack'],
        primitives: [leaf('note')],
      })
    ).not.toThrow();
  });

  it('copies styleAdapter onto the pack', () => {
    const styleAdapter = {
      createCollector: () => ({}),
      createRenderContext: () => ({}),
      renderStyles: () => '',
    };
    const pack = definePrimitivePack({
      id: 'styled',
      surfaces: [],
      primitives: [leaf('note')],
      styleAdapter,
    });
    expect(pack.styleAdapter).toBe(styleAdapter);
  });

  it('derives styleCollector from the style adapter unless overridden', () => {
    const styleAdapter = {
      styleCollector: 'distillate',
      createCollector: () => ({}),
      createRenderContext: () => ({}),
      renderStyles: () => '',
    };
    const derived = definePrimitivePack({
      id: 'styled',
      primitives: [leaf('note')],
      styleAdapter,
    });
    expect(derived.styleCollector).toBe('distillate');
    const overridden = definePrimitivePack({
      id: 'styled',
      primitives: [leaf('note')],
      styleAdapter,
      styleCollector: 'custom',
    });
    expect(overridden.styleCollector).toBe('custom');
    const bare = definePrimitivePack({
      id: 'plain',
      primitives: [leaf('note')],
    });
    expect(bare.styleCollector).toBeUndefined();
  });

  it('copies authoring onto the pack', () => {
    const authoring = { describe: { note: 'A note.' } };
    const pack = definePrimitivePack({
      id: 'documented',
      surfaces: [],
      primitives: [leaf('note')],
      authoring,
    });
    expect(pack.authoring).toEqual(authoring);
  });

  it('rejects a group naming a type the pack does not register', () => {
    const define = () =>
      definePrimitivePack({
        id: 'grouped',
        primitives: [leaf('note')],
        authoring: { groups: [{ title: 'Text', types: ['note', 'quote'] }] },
      });
    expect(define).toThrow(
      'primitive pack "grouped": group "Text" names primitive type "quote", which the pack does not register'
    );
    expect(caught(define)).toMatchObject({ code: 'UNKNOWN_PRIMITIVE_TYPE' });
  });

  it('derives groups from each primitive, in definition order', () => {
    const pack = definePrimitivePack({
      id: 'grouped',
      primitives: [
        leaf('note', 'Text'),
        leaf('chart', 'Data'),
        leaf('quote', 'Text'),
        leaf('loose'),
      ],
    });
    expect(pack.authoring?.groups).toEqual([
      { title: 'Text', types: ['note', 'quote'] },
      { title: 'Data', types: ['chart'] },
    ]);
  });

  it('orders derived groups by groupOrder and does not store it', () => {
    const pack = definePrimitivePack({
      id: 'grouped',
      primitives: [leaf('note', 'Text'), leaf('chart', 'Data')],
      authoring: { groupOrder: ['Data', 'Text'] },
    });
    expect(pack.authoring).toEqual({
      groups: [
        { title: 'Data', types: ['chart'] },
        { title: 'Text', types: ['note'] },
      ],
    });
  });

  it.each([
    ['omits a declared heading', ['Text']],
    ['lists a heading no primitive names', ['Text', 'Data', 'Notes']],
    ['repeats a heading', ['Text', 'Data', 'Text']],
  ])('rejects a groupOrder that %s', (_, groupOrder) => {
    const define = () =>
      definePrimitivePack({
        id: 'grouped',
        primitives: [leaf('note', 'Text'), leaf('chart', 'Data')],
        authoring: { groupOrder },
      });
    expect(caught(define)).toMatchObject({ code: 'INVALID_PACK_GROUPS' });
  });

  it.each([
    ['groupOrder', [leaf('note')], { groupOrder: ['Notes'] }],
    ['a catalog.group', [leaf('note', 'Text')], {}],
  ])('rejects explicit groups beside %s', (_, primitives, authoring) => {
    const define = () =>
      definePrimitivePack({
        id: 'grouped',
        primitives,
        authoring: {
          ...authoring,
          groups: [{ title: 'Notes', types: ['note'] }],
        },
      });
    expect(define).toThrow(
      'primitive pack "grouped": pass groups, or catalog.group with an optional groupOrder, not both'
    );
    expect(caught(define)).toMatchObject({ code: 'INVALID_PACK_GROUPS' });
  });

  it('rejects a type in two groups', () => {
    const define = () =>
      definePrimitivePack({
        id: 'grouped',
        primitives: [leaf('note')],
        authoring: {
          groups: [
            { title: 'Text', types: ['note'] },
            { title: 'Notes', types: ['note'] },
          ],
        },
      });
    expect(define).toThrow(
      'primitive pack "grouped": primitive type "note" is in two groups'
    );
    expect(caught(define)).toMatchObject({ code: 'DUPLICATE_PRIMITIVE_TYPE' });
  });
});

describe('definePrimitivePack theme', () => {
  it('returns PrimitivePack<TTheme> for an explicit palette', () => {
    const pack = definePrimitivePack<{ ink: string }>({
      id: 'charts',
      surfaces: [],
      primitives: [leaf('note')],
    });
    expectTypeOf(pack).toEqualTypeOf<PrimitivePack<{ ink: string }>>();
  });

  it('stays PrimitivePack<unknown> when theme is omitted', () => {
    const pack = definePrimitivePack({
      id: 'notes',
      surfaces: [],
      primitives: [leaf('note')],
    });
    expectTypeOf(pack).toEqualTypeOf<PrimitivePack<unknown>>();
  });
});

describe('definePrimitivePack icons', () => {
  const icon = (type: string) => ({
    svg: `<svg viewBox="0 0 16 16" data-type="${type}"></svg>`,
  });
  const withIcon = (type: string) => ({ ...leaf(type), icon: icon(type) });
  const iconsOf = (primitives: AnyPrimitiveDefinition[]) => {
    const { icons } = definePrimitivePack({ id: 'p', primitives });
    if (icons === undefined) {
      throw new Error('definePrimitivePack set no icons');
    }
    return icons;
  };

  it('maps only the primitives that declare an icon', () => {
    const icons = iconsOf([withIcon('note'), leaf('memo')]);
    expect(Object.keys(icons)).toEqual(['note']);
    expect(icons['note']).toEqual(icon('note'));
  });

  it('is an empty frozen null-prototype dictionary when none declares one', () => {
    const icons = iconsOf([leaf('memo')]);
    expect(Object.keys(icons)).toEqual([]);
    expect(Object.isFrozen(icons)).toBe(true);
    expect(Object.getPrototypeOf(icons)).toBeNull();
  });

  it('treats prototype keys as ordinary types', () => {
    const icons = iconsOf([withIcon('__proto__')]);
    expect(Object.keys(icons)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(icons)).toBeNull();
    expect(icons['__proto__']).toEqual(icon('__proto__'));
    const lookup = (type: string) => icons[type];
    expect(lookup('constructor')).toBeUndefined();
    expect(lookup('toString')).toBeUndefined();
  });
});
