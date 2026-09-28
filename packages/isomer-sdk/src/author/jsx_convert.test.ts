/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInNewContext } from 'node:vm';

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { PrimitiveNode } from '../define/primitive_module';

import { fromChildren, fromTextChildren } from './authored_fields';
import { buildJsxShim } from './jsx_shim';

const primitives = [
  { type: 'note' as const },
  {
    type: 'stack' as const,
    children: (node: { items: PrimitiveNode[] }) =>
      node.items.map((item, index) => ({
        node: item,
        path: `items[${index}]`,
      })),
  },
  {
    type: 'pair' as const,
    children: (node: { side: { main: PrimitiveNode } }) => [
      { node: node.side.main, path: 'side.main' },
    ],
  },
  {
    type: 'caption' as const,
    schema: z.object({
      type: z.literal('caption'),
      text: fromTextChildren(z.string()),
    }),
  },
  {
    type: 'group' as const,
    schema: z.object({
      type: z.literal('group'),
      items: fromChildren(
        'entry',
        z.array(z.object({ title: z.string(), body: z.array(z.unknown()) }))
      ),
    }),
    children: (node: { items: { body: PrimitiveNode[] }[] }) =>
      node.items.flatMap(({ body }, index) =>
        body.map((item, at) => ({
          node: item,
          path: `items[${index}].body[${at}]`,
        }))
      ),
  },
] as const;

const shim = buildJsxShim(primitives);

const expectIsomerError = (run: () => unknown, code: string) => {
  try {
    run();
    expect.unreachable();
  } catch (error) {
    expect(error).toMatchObject({ name: 'IsomerError', code });
  }
};

describe('toComposition', () => {
  const { Composition, Entry, Group, Note, Pair } = shim;

  it('copies the root fields, version included', () => {
    const { body, ...root } = shim.toComposition(
      createElement(
        Composition,
        {
          version: 1,
          title: 'Title',
          subtitle: 'Subtitle',
          theme: 'dark',
          meta: { source: 'test' },
        },
        createElement(Note, { text: 'a' })
      )
    );
    expect(root).toEqual({
      type: 'view',
      version: 1,
      title: 'Title',
      subtitle: 'Subtitle',
      theme: 'dark',
      meta: { source: 'test' },
    });
    expect(body).toEqual([{ type: 'note', text: 'a' }]);
  });

  it('refuses two types that become the same component', () => {
    expect(() =>
      buildJsxShim([
        { type: 'note' as const },
        { type: 'Note' as const },
      ] as const)
    ).toThrow(/"note" and "Note" both become the component Note/);
  });

  it('converts nodes nested inside the items of a branded child field', () => {
    expect(
      shim.toComposition(
        createElement(
          Composition,
          null,
          createElement(
            Group,
            null,
            createElement(Entry, {
              title: 'A',
              body: [createElement(Note, { text: 'inner' })],
            })
          )
        )
      ).body
    ).toEqual([
      {
        type: 'group',
        items: [{ title: 'A', body: [{ type: 'note', text: 'inner' }] }],
      },
    ]);
  });

  it('converts a node nested in a prop of a branded child item', () => {
    const [group] = shim.toComposition(
      createElement(
        Composition,
        null,
        createElement(
          Group,
          null,
          createElement(Entry, {
            title: 'a',
            body: [{ nested: createElement(Note, { text: 'n' }) }],
          })
        )
      )
    ).body as unknown as [{ items: { body: unknown[] }[] }];
    expect(group.items[0]?.body).toEqual([
      { nested: { type: 'note', text: 'n' } },
    ]);
  });

  it('converts a node inside a prop object from another realm', () => {
    const side = runInNewContext('({ label: "L" })') as Record<string, unknown>;
    side.main = createElement(Note, { text: 'main' });
    expect(
      shim.toComposition(
        createElement(Composition, null, createElement(Pair, { side }))
      ).body
    ).toEqual([
      {
        type: 'pair',
        side: { label: 'L', main: { type: 'note', text: 'main' } },
      },
    ]);
  });

  it('converts a node inside a null-prototype prop object', () => {
    const side = Object.assign(Object.create(null) as object, {
      main: createElement(Note, { text: 'main' }),
    });
    expect(
      shim.toComposition(
        createElement(Composition, null, createElement(Pair, { side }))
      ).body
    ).toEqual([
      { type: 'pair', side: { main: { type: 'note', text: 'main' } } },
    ]);
  });

  it('keeps nested arrays in a prop as nested arrays', () => {
    const grid = [[1, 2], [3], []];
    expect(
      shim.toComposition(
        createElement(
          Composition,
          null,
          createElement(Note, { text: 'a', grid })
        )
      ).body
    ).toEqual([{ type: 'note', text: 'a', grid }]);
  });

  it('refuses a prop value nested too deep to convert, or a cycle, with an IsomerError', () => {
    let deep: Record<string, unknown> = {};
    for (let level = 0; level < 1000; level += 1) {
      deep = { deep };
    }
    const cyclic: Record<string, unknown> = {};
    cyclic.self = [cyclic];
    for (const meta of [deep, cyclic]) {
      expectIsomerError(
        () =>
          shim.toComposition(
            createElement(Composition, null, createElement(Note, { meta }))
          ),
        'INVALID_BODY_NODE'
      );
    }
  });
});
