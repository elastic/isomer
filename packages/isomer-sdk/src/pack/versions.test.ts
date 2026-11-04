/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';
import { buildAuthoringJsonSchema } from '../validate/authoring_schema';
import { createCompositionValidator } from '../validate/validation';

import { describeCapabilities } from './capabilities';
import { definePrimitivePack, packVersionOf } from './primitive_pack';
import {
  comparePackVersions,
  packVersionsOf,
  stampPackVersions,
} from './versions';

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

interface Box extends PrimitiveNode {
  type: 'box';
  items: PrimitiveNode[];
}

const box = definePrimitive<Box>({
  type: 'box',
  catalog: {
    type: 'box',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  },
  examples: [],
  schema: z.object({
    type: z.literal('box'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  schemaFor: (bodyNode) =>
    z.object({ type: z.literal('box'), items: z.array(bodyNode) }),
  children: (node) =>
    node.items.map((item, index) => ({ node: item, path: `items[${index}]` })),
  renderers,
});

const layout = definePrimitivePack({
  id: 'layout',
  version: 3,
  primitives: [box],
});
const notes = definePrimitivePack({ id: 'notes', primitives: [leaf('note')] });
const charts = definePrimitivePack({
  id: 'charts',
  version: 2,
  primitives: [leaf('chart')],
});
const packs = [layout, notes, charts];

const nested: Composition = {
  type: 'view',
  body: [{ type: 'box', items: [{ type: 'chart' }] } as PrimitiveNode],
};

describe('pack version', () => {
  it('defaults to 1', () => {
    expect(notes.version).toBe(1);
    expect(packVersionOf({})).toBe(1);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects %s', (version) => {
    expect(() =>
      definePrimitivePack({ id: 'bad', version, primitives: [leaf('x')] })
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'INVALID_PACK_VERSION',
      }) as Error
    );
  });

  it('is reported in capabilities', () => {
    expect(describeCapabilities(packs, { surfaces: [] }).packs).toEqual({
      layout: 3,
      notes: 1,
      charts: 2,
    });
  });
});

describe('stampPackVersions', () => {
  it('records versions and keeps entries for other packs', () => {
    const stamped = stampPackVersions(
      { ...nested, packs: { layout: 1, other: 4 } },
      packVersionsOf(packs)
    );
    expect(stamped.packs).toEqual({ layout: 3, other: 4, notes: 1, charts: 2 });
    expect(stamped.body).toBe(nested.body);
  });
});

describe('comparePackVersions', () => {
  it('finds nothing when the stamp matches', () => {
    expect(
      comparePackVersions(
        stampPackVersions(nested, packVersionsOf(packs)),
        packs
      )
    ).toEqual([]);
  });

  it('reports newer, older and unknown packs', () => {
    expect(
      comparePackVersions(
        { ...nested, packs: { layout: 4, charts: 1, notes: 1, maps: 1 } },
        packs
      )
    ).toEqual([
      { pack: 'charts', kind: 'older', stamped: 1, held: 2 },
      { pack: 'layout', kind: 'newer', stamped: 4, held: 3 },
      { pack: 'maps', kind: 'unknown', stamped: 1 },
    ]);
  });

  it('reports packs whose types appear, nested, without a stamp', () => {
    expect(comparePackVersions(nested, packs)).toEqual([
      { pack: 'charts', kind: 'unstamped', held: 2 },
      { pack: 'layout', kind: 'unstamped', held: 3 },
    ]);
  });
});

describe('the stamp in a composition', () => {
  const validate = createCompositionValidator(
    packs.flatMap((pack) => pack.primitives)
  );

  it('validates as positive integers per pack', () => {
    expect(validate({ ...nested, packs: { layout: 3 } }).valid).toBe(true);
    expect(validate({ ...nested, packs: { layout: 0 } }).valid).toBe(false);
    expect(validate({ ...nested, packs: { layout: 1.5 } }).valid).toBe(false);
  });

  it('is never shown to an author', () => {
    const schema = buildAuthoringJsonSchema(
      packs.flatMap((pack) => pack.primitives)
    );
    expect(Object.keys(schema.properties as object)).not.toContain('packs');
  });
});
