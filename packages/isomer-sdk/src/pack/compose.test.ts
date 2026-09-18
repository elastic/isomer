/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';

import { composePacks } from './compose';
import type { EnhancementDefinition } from './enhancements';
import { definePrimitivePack } from './primitive_pack';

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

const pack = (
  id: string,
  types: string[],
  extra: {
    enhancements?: EnhancementDefinition[];
    slackAssetTypes?: string[];
  } = {}
) =>
  definePrimitivePack({
    id,
    surfaces: [],
    primitives: types.map(leaf),
    ...extra,
  });

describe('composePacks', () => {
  it('returns a frozen inventory to hold', () => {
    const composed = composePacks([pack('notes', ['note'])]);
    expect(Object.isFrozen(composed)).toBe(true);
    expect(Object.isFrozen(composed.definitions)).toBe(true);
    expect(composed.definitions.map((definition) => definition.type)).toEqual([
      'note',
    ]);
  });

  it('flattens definitions, enhancements, and slack asset types', () => {
    const notes = pack('notes', ['note'], {
      enhancements: [enhancement('copy')],
    });
    const charts = pack('charts', ['chart'], { slackAssetTypes: ['chart'] });
    const composed = composePacks([notes, charts]);
    expect(composed.definitions.map((definition) => definition.type)).toEqual([
      'note',
      'chart',
    ]);
    expect(composed.enhancements.map((definition) => definition.id)).toEqual([
      'copy',
    ]);
    expect([...composed.slackAssetTypes]).toEqual(['chart']);
  });

  it('rejects a node type claimed by two packs', () => {
    expect(() =>
      composePacks([pack('a', ['note']), pack('b', ['note'])])
    ).toThrow('primitive type "note" registered by "a" and "b"');
  });

  it('identifies cross-pack duplicate types by name and code', () => {
    try {
      composePacks([pack('a', ['note']), pack('b', ['note'])]);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'DUPLICATE_PRIMITIVE_TYPE',
      });
    }
  });

  it('rejects an enhancement id claimed by two packs', () => {
    expect(() =>
      composePacks([
        pack('a', ['note'], { enhancements: [enhancement('sort')] }),
        pack('b', ['chart'], { enhancements: [enhancement('sort')] }),
      ])
    ).toThrow('enhancement "sort" registered by "a" and "b"');
  });
});
