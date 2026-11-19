/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The pack side of versioning, following the worked examples on isomer#201:
// `obs` is a made-up Observability pack, `slides` stands in for the reference pack.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createChildNodeWalker } from '../composition/body_node_base';
import type { Composition } from '../composition/composition';
import { mapCompositionNodes } from '../composition/map_nodes';
import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';

import { describeCapabilities } from './capabilities';
import { composePacks } from './compose';
import {
  ownedTypes,
  PACK_CONTRACT_VERSION,
  type PackMigration,
  type PackMigrations,
} from './migrations';
import {
  type AnyPrimitivePack,
  definePrimitivePack,
  type PrimitivePack,
} from './primitive_pack';

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

const thrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
};

const isomerError = (code: string, message = '') =>
  expect.objectContaining({
    name: 'IsomerError',
    code,
    message: expect.stringContaining(message) as unknown,
  }) as unknown;

const sourceLeaves = (...types: string[]): PackMigration['children'] =>
  Object.fromEntries(types.map((type) => [type, () => []]));
const identityStep: PackMigration = { children: sourceLeaves('x') };

const slidesPack = definePrimitivePack({
  id: 'slides',
  version: 2,
  migrations: { 1: { children: sourceLeaves('slideFrame') } },
  primitives: [leaf('slideFrame')],
});

// Example 1: the first version.
const obsV1Pack = definePrimitivePack({
  id: 'obs',
  primitives: ['metric', 'alertList', 'panel', 'sparkline'].map(leaf),
});

// Example 3: renames, keyed by the type as it was at the step's source version.
const obsV1: PackMigration = {
  nodes: {
    metric: (node) => ({ ...node, type: 'obsMetric' }),
    alertList: (node) => ({ ...node, type: 'obsAlertList' }),
    panel: (node) => ({ ...node, type: 'obsSection' }),
  },
  children: sourceLeaves('metric', 'alertList', 'panel', 'sparkline'),
};
// Example 5: a same-name field migration, keyed by a type that still exists.
const obsV2: PackMigration = {
  children: sourceLeaves(
    'obsMetric',
    'obsAlertList',
    'obsSection',
    'sparkline'
  ),
  nodes: { obsMetric: (node) => node },
};
// Example 6: retiring a primitive.
const obsV3: PackMigration = {
  children: obsV2.children,
  nodes: { sparkline: () => null },
};

const obsV4Pack = definePrimitivePack({
  id: 'obs',
  version: 4,
  migrations: { 1: obsV1, 2: obsV2, 3: obsV3 },
  primitives: ['obsMetric', 'obsAlertList', 'obsSection'].map(leaf),
});

describe('a pack version', () => {
  it('is 1 when absent, and the pack is built for this contract', () => {
    expect(obsV1Pack).toMatchObject({
      version: 1,
      migrations: {},
      contract: PACK_CONTRACT_VERSION,
    });
  });

  it('is reported by capabilities, by pack id', () => {
    expect(
      describeCapabilities([slidesPack, obsV1Pack], { surfaces: [] }).packs
    ).toEqual({ slides: 2, obs: 1 });
  });

  it.each([0, -1, 1.5, Number.NaN, '2', Number.POSITIVE_INFINITY, 2n])(
    'rejects %s',
    (version) => {
      expect(
        thrown(() =>
          definePrimitivePack({
            id: 'bad',
            version: version as number,
            primitives: [leaf('x')],
          })
        )
      ).toEqual(isomerError('INVALID_PACK_VERSION', 'primitive pack "bad"'));
    }
  );

  it('is checked on a pack that did not come from definePrimitivePack', () => {
    expect(thrown(() => composePacks([{ ...obsV1Pack, version: 0 }]))).toEqual(
      isomerError('INVALID_PACK_VERSION')
    );
  });
});

describe('a pack’s migrations', () => {
  it.each<[string, number, PackMigrations]>([
    ['a missing step', 3, { 1: identityStep }],
    ['an extra step', 2, { 1: identityStep, 2: identityStep, 3: identityStep }],
    ['a step 0', 2, { 0: identityStep, 1: identityStep }],
    [
      'a step for the version itself',
      3,
      { 1: identityStep, 2: identityStep, 3: identityStep },
    ],
    ['any step at version 1', 1, { 1: identityStep }],
  ])('rejects %s', (_, version, migrations) => {
    expect(
      thrown(() =>
        definePrimitivePack({
          id: 'obs',
          version,
          migrations,
          primitives: [leaf('x')],
        })
      )
    ).toEqual(isomerError('INVALID_PACK_MIGRATIONS', 'primitive pack "obs"'));
  });

  it('names what is missing and what is extra', () => {
    expect(
      thrown(() =>
        definePrimitivePack({
          id: 'obs',
          version: 3,
          migrations: { 1: identityStep, 3: identityStep },
          primitives: [leaf('x')],
        })
      )
    ).toEqual(
      isomerError(
        'INVALID_PACK_MIGRATIONS',
        'migrations keys must be exactly 1..2, one per step to version 3; missing 2; unexpected "3"'
      )
    );
  });

  it('reports a huge gap without enumerating it', () => {
    expect(
      thrown(() =>
        definePrimitivePack({
          id: 'obs',
          version: Number.MAX_SAFE_INTEGER,
          migrations: { 2: identityStep },
          primitives: [leaf('x')],
        })
      )
    ).toEqual(
      isomerError(
        'INVALID_PACK_MIGRATIONS',
        `; missing 1, 3, 4, 5, 6, … (${Number.MAX_SAFE_INTEGER - 2} in all)`
      )
    );
  });

  it.each<[string, unknown]>([
    ['a step that is not an object', null],
    ['a node transform that is not a function', { nodes: { metric: 1 } }],
    ['a children override that is not a function', { children: { panel: [] } }],
    [
      'a composition step that is not a function',
      { children: sourceLeaves('x'), composition: {} },
    ],
  ])('rejects %s', (_, step) => {
    expect(
      thrown(() =>
        definePrimitivePack({
          id: 'obs',
          version: 2,
          migrations: { 1: step as PackMigration },
          primitives: [leaf('x')],
        })
      )
    ).toEqual(isomerError('INVALID_PACK_MIGRATIONS', 'migrations[1]'));
  });

  it('may name a current type, and a type in more than one step', () => {
    const pack = definePrimitivePack({
      id: 'obs',
      version: 3,
      migrations: {
        1: {
          children: sourceLeaves('metric'),
          nodes: { metric: (node) => node },
        },
        2: {
          children: sourceLeaves('metric'),
          nodes: { metric: (node) => node },
        },
      },
      primitives: [leaf('metric')],
    });
    expect([...ownedTypes(pack)]).toEqual(['metric']);
    expect(() => composePacks([pack])).not.toThrow();
  });
});

describe('ownership', () => {
  it('covers current types and every type a step names', () => {
    expect([...ownedTypes(obsV4Pack)].sort()).toEqual(
      [
        'alertList',
        'metric',
        'obsAlertList',
        'obsMetric',
        'obsSection',
        'panel',
        'sparkline',
      ].sort()
    );
  });

  // Example 9: a retired name reused in another pack.
  it('refuses another pack registering a retired name', () => {
    const secPack = definePrimitivePack({
      id: 'sec',
      primitives: [leaf('alertList')],
    });
    expect(thrown(() => composePacks([obsV4Pack, secPack]))).toEqual(
      isomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        'primitive type "alertList" registered by "obs" (historical, migrations[1]) and "sec"'
      )
    );
    expect(thrown(() => composePacks([secPack, obsV4Pack]))).toEqual(
      isomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        'primitive type "alertList" registered by "sec" and "obs" (historical, migrations[1])'
      )
    );
  });

  it('refuses two packs whose migrations name one type', () => {
    const secPack = definePrimitivePack({
      id: 'sec',
      version: 3,
      migrations: { 1: identityStep, 2: { children: { panel: () => [] } } },
      primitives: [leaf('secPanel')],
    });
    expect(thrown(() => composePacks([obsV4Pack, secPack]))).toEqual(
      isomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        'primitive type "panel" registered by "obs" (historical, migrations[1]) and "sec" (historical, migrations[2])'
      )
    );
  });

  it('still refuses two packs registering one current type', () => {
    expect(
      thrown(() =>
        composePacks([
          obsV4Pack,
          definePrimitivePack({ id: 'sec', primitives: [leaf('obsMetric')] }),
        ])
      )
    ).toEqual(
      isomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        'primitive type "obsMetric" registered by "obs" and "sec"'
      )
    );
  });

  it('composes packs whose owned types are disjoint', () => {
    expect(
      composePacks([slidesPack, obsV4Pack]).definitions.map(({ type }) => type)
    ).toEqual(['slideFrame', 'obsMetric', 'obsAlertList', 'obsSection']);
  });
});

// Example 19: a pack built against the 0.3.0 SDK.
describe('a pack that predates versions', () => {
  const legacyPack: PrimitivePack = {
    id: 'legacy',
    surfaces: [],
    primitives: [leaf('banner')],
    types: new Set(['banner']),
    enhancements: [],
    slackAssetTypes: new Set(),
  };

  it('composes as version 1 with no migrations', () => {
    expect(() => composePacks([legacyPack])).not.toThrow();
    expect(describeCapabilities([legacyPack], { surfaces: [] }).packs).toEqual({
      legacy: 1,
    });
  });

  it('is refused when built for another pack contract', () => {
    const newer: AnyPrimitivePack = {
      ...legacyPack,
      contract: PACK_CONTRACT_VERSION + 1,
    };
    expect(thrown(() => composePacks([newer]))).toEqual(
      isomerError(
        'INCOMPATIBLE_PACK_CONTRACT',
        `primitive pack "legacy" was built for pack contract ${PACK_CONTRACT_VERSION + 1}`
      )
    );
  });
});

describe('source vocabulary declarations', () => {
  it.each([
    {},
    { children: {} },
    { composition: (composition: unknown) => composition },
  ])('rejects a step without its source vocabulary', (step) => {
    expect(() =>
      definePrimitivePack({
        id: 'notes',
        version: 2,
        primitives: [leaf('note')],
        migrations: { 1: step as PackMigration },
      })
    ).toThrow(expect.objectContaining({ code: 'INVALID_PACK_MIGRATIONS' }));
  });

  it('rejects transforms outside the declared source vocabulary', () => {
    expect(() =>
      definePrimitivePack({
        id: 'notes',
        version: 2,
        primitives: [leaf('note')],
        migrations: {
          1: {
            children: { note: () => [] },
            nodes: { retired: (node) => node },
          },
        },
      })
    ).toThrow(expect.objectContaining({ code: 'INVALID_PACK_MIGRATIONS' }));
  });

  it('reserves historical types used only by a composition transform', () => {
    const notes = definePrimitivePack({
      id: 'notes',
      version: 2,
      primitives: [leaf('note')],
      migrations: {
        1: {
          children: { retired: () => [] },
          composition: (composition) => ({
            ...composition,
            body: composition.body.map((node) =>
              node.type === 'retired' ? { ...node, type: 'note' } : node
            ),
          }),
        },
      },
    });
    const stored: Composition = {
      type: 'view',
      packs: { notes: 1, foreign: 3 },
      body: [{ type: 'retired' }, { type: 'foreignNote' }],
    };
    expect(notes.migrations![1]!.composition!(stored)).toEqual({
      ...stored,
      body: [{ type: 'note' }, { type: 'foreignNote' }],
    });
    expect([...ownedTypes(notes)]).toEqual(['note', 'retired']);
    expect(() =>
      composePacks([
        notes,
        definePrimitivePack({ id: 'other', primitives: [leaf('retired')] }),
      ])
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_PRIMITIVE_TYPE' }));
  });
});

describe('historical traversal across three versions', () => {
  interface Panel extends PrimitiveNode {
    type: 'panel';
    items?: PrimitiveNode[];
    contents?: PrimitiveNode[];
    label?: string;
  }
  const items: PackMigration['children'][string] = (node) =>
    (node as Panel).items!.map((child, index) => ({
      node: child,
      path: `items[${index}]`,
    }));
  const contents = (node: Panel) =>
    node.contents!.map((child, index) => ({
      node: child,
      path: `contents[${index}]`,
    }));
  const first: PackMigration = {
    children: { panel: items },
    nodes: { panel: (node) => ({ ...node, label: 'v2' }) },
  };
  const second: PackMigration = {
    children: { panel: items },
    nodes: {
      panel: (node) => {
        const { items: children, ...rest } = node as Panel;
        return { ...rest, contents: children };
      },
    },
  };
  const panel = definePrimitive<Panel>({
    type: 'panel',
    catalog: {
      type: 'panel',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: z.object({
      type: z.literal('panel'),
      contents: z.array(z.looseObject({ type: z.string() })),
      label: z.string(),
    }),
    children: contents,
    renderers,
  });
  const panels = definePrimitivePack({
    id: 'panels',
    version: 3,
    migrations: { 1: first, 2: second },
    primitives: [panel],
  });
  const notes = definePrimitivePack({
    id: 'notes',
    version: 2,
    migrations: {
      1: {
        children: sourceLeaves('oldNote'),
        nodes: { oldNote: () => ({ type: 'note' }) },
      },
    },
    primitives: [leaf('note')],
  });

  it.each([true, false])(
    'keeps foreign children reachable, panel pack first: %s',
    (panelFirst) => {
      const input: Composition = {
        type: 'view',
        body: [{ type: 'panel', items: [{ type: 'oldNote' }] } as Panel],
      };
      expect(() =>
        mapCompositionNodes(
          input,
          createChildNodeWalker([...panels.primitives, ...notes.primitives]),
          (node) => node
        )
      ).toThrow();
      let document = input;
      const positions = new Map([
        ['panels', 1],
        ['notes', 1],
      ]);
      const order = panelFirst ? [panels, notes] : [notes, panels];
      for (const pack of order) {
        while (positions.get(pack.id)! < pack.version!) {
          const step = pack.migrations![positions.get(pack.id)!]!;
          const definitions = order.flatMap<{
            type: string;
            children?: unknown;
          }>((held) => {
            const source = held.migrations?.[positions.get(held.id)!];
            return source
              ? Object.entries(source.children).map(([type, children]) => ({
                  type,
                  children,
                }))
              : held.primitives;
          });
          document = mapCompositionNodes(
            document,
            createChildNodeWalker(definitions),
            (node) => {
              const transform = Object.hasOwn(step.nodes ?? {}, node.type)
                ? step.nodes![node.type]
                : undefined;
              return transform ? transform(node)! : node;
            }
          );
          positions.set(pack.id, positions.get(pack.id)! + 1);
        }
      }
      expect(document).toEqual({
        type: 'view',
        body: [{ type: 'panel', label: 'v2', contents: [{ type: 'note' }] }],
      });
      expect(input).toEqual({
        type: 'view',
        body: [{ type: 'panel', items: [{ type: 'oldNote' }] }],
      });
      expect(first.children.panel).toBe(items);
      expect(panel.children).toBe(contents);
    }
  );
});

it.each(['__proto__', 'constructor', 'toString'])(
  'owns source type %s as an own key',
  (type) => {
    const pack = definePrimitivePack({
      id: 'notes',
      version: 2,
      primitives: [leaf('note')],
      migrations: {
        1: {
          children: { [type]: () => [] },
          nodes: { [type]: () => ({ type: 'note' }) },
        },
      },
    });
    expect(ownedTypes(pack).has(type)).toBe(true);
    expect(() =>
      composePacks([
        pack,
        definePrimitivePack({ id: 'other', primitives: [leaf(type)] }),
      ])
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_PRIMITIVE_TYPE' }));
  }
);
