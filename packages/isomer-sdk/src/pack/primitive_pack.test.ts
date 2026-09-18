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
import {
  definePrimitivePack,
  extendPrimitivePack,
  type PrimitivePack,
  themeBound,
} from './primitive_pack';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => '',
};

const leaf = (type: string) =>
  definePrimitive<PrimitiveNode>({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema: z.object({ type: z.literal(type) }),
    renderers,
  });

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
});

describe('extendPrimitivePack', () => {
  it('adds primitives and keeps the declared surfaces', () => {
    const pack = definePrimitivePack({
      id: 'notes',
      surfaces: ['slack'],
      primitives: [leaf('note')],
    });
    const extended = extendPrimitivePack(pack, [leaf('aside')]);
    expect([...extended.types]).toEqual(['note', 'aside']);
    expect(extended.surfaces).toEqual(['slack']);
  });

  it('rejects a type the pack already owns or that repeats in the addition', () => {
    const pack = definePrimitivePack({
      id: 'notes',
      primitives: [leaf('note')],
    });
    expect(() => extendPrimitivePack(pack, [leaf('note')])).toThrow(
      'primitive pack "notes": primitive type "note" registered twice'
    );
    try {
      extendPrimitivePack(pack, [leaf('aside'), leaf('aside')]);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'DUPLICATE_PRIMITIVE_TYPE',
        message:
          'primitive pack "notes": primitive type "aside" registered twice',
      });
    }
  });

  it('keeps the styleCollector derived from the style adapter', () => {
    const pack = definePrimitivePack({
      id: 'styled',
      primitives: [leaf('note')],
      styleAdapter: {
        styleCollector: 'distillate',
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: () => '',
      },
    });
    expect(extendPrimitivePack(pack, [leaf('aside')]).styleCollector).toBe(
      'distillate'
    );
  });
});

describe('themeBound', () => {
  it('infers PrimitivePack<TTheme> from the theme carrier', () => {
    const pack = definePrimitivePack({
      id: 'charts',
      surfaces: [],
      primitives: [leaf('note')],
      theme: themeBound<{ ink: string }>(),
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
