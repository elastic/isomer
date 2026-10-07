/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import {
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

const leaf = (type: string) =>
  definePrimitive<PrimitiveNode>({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
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
    expect(pack.authoring).toBe(authoring);
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
