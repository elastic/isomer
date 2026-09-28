/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInNewContext } from 'node:vm';

import { createElement, type ReactElement } from 'react';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { PrimitiveNode } from '../define/primitive_module';
import { MAX_COMPOSITION_DEPTH } from '../validate/validation';

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
const components = Object.entries(shim).filter(
  ([name]) =>
    name !== 'toComposition' && name !== 'toJsx' && name !== 'component'
);

type Printable = Parameters<typeof shim.toJsx>[0];

/** Writes printed JSX through a UTF-8 file, compiles it, and runs it in another realm against the shim's components, as an author's file would. */
const roundTrip = (composition: Printable) => {
  const file = new TextDecoder().decode(
    new TextEncoder().encode(`(${shim.toJsx(composition)})`)
  );
  const { outputText } = ts.transpileModule(file, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      target: ts.ScriptTarget.ES2022,
    },
  });
  const run = runInNewContext(
    `(h, ${components.map(([name]) => name).join(', ')}) => ${outputText.trim().replace(/;$/, '')}`
  ) as (...args: unknown[]) => ReactElement;
  const element = run(
    createElement,
    ...components.map(([, component]) => component)
  );
  return shim.toComposition(
    element as Parameters<typeof shim.toComposition>[0]
  );
};

const hostile = [
  'line\nfeed',
  'carriage\rreturn',
  'line\u2028separator',
  'paragraph\u2029separator',
  'back\\slash',
  'quote "double" and \'single\'',
  '{braces} <angles> &amp; &#38; &#x26;',
  'named a&amp;b',
  'named with digits a&frac12;b m&sup2; &there4;',
  'decimal a&#38;b',
  'hex a&#x26;b',
  'bare & ampersand',
  'lone high x\uD800y',
  'lone low x\uDC00y',
  'trailing high \uD83D',
  '\uDE00 leading low',
  'paired \uD83D\uDE00',
  '',
];

const expectIsomerError = (run: () => unknown, code: string) => {
  try {
    run();
    expect.unreachable();
  } catch (error) {
    expect(error).toMatchObject({ name: 'IsomerError', code });
  }
};
describe('toJsx', () => {
  it.each(hostile.map((text) => [JSON.stringify(text), text] as const))(
    'round-trips %s as an attribute and inside a nested value',
    (_name, text) => {
      const node = {
        type: 'note',
        text,
        meta: { text, list: [text, { text }] },
      } as PrimitiveNode;
      const composition = { type: 'view' as const, title: text, body: [node] };
      expect(roundTrip(composition)).toEqual(composition);
    }
  );

  it('round-trips keys that are not identifiers, and an own __proto__ in a nested value', () => {
    const meta = JSON.parse(
      '{"__proto__": {"x": 1}, "constructor": 2, "a b": 3, "": 4}'
    ) as Record<string, unknown>;
    const composition = {
      type: 'view' as const,
      body: [{ type: 'note', meta } as PrimitiveNode],
    };
    const [node] = roundTrip(composition).body as unknown as [{ meta: object }];
    expect(Object.hasOwn(node.meta, '__proto__')).toBe(true);
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('keeps nested arrays in a prop as nested arrays', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'note',
          grid: [[1, 2], [3], []],
          meta: { rows: [[['a']]] },
        } as PrimitiveNode,
      ],
    };
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('prints a field set to undefined as absent, as JSON does', () => {
    const composition = {
      type: 'view' as const,
      body: [{ type: 'note', tone: undefined, text: 'a' } as PrimitiveNode],
    };
    const json = JSON.parse(JSON.stringify(composition)) as Printable;
    expect(shim.toJsx(composition)).toBe(shim.toJsx(json));
    expect(roundTrip(composition)).toEqual(json);
  });

  it('round-trips the root fields, version included', () => {
    const composition = {
      type: 'view' as const,
      version: 1 as const,
      title: 'Title',
      subtitle: 'Subtitle',
      theme: 'dark' as const,
      meta: { source: 'test' },
      body: [{ type: 'note', text: 'a' } as PrimitiveNode],
    };
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('refuses a body entry that is not a registered node, and a body that is no array', () => {
    expect(() =>
      shim.toJsx({ type: 'view', body: [{ type: 'unknown' }] })
    ).toThrow(/body\[0\] is not a node of a registered primitive/);
    expect(() =>
      shim.toJsx({ type: 'view', body: 'x' } as unknown as Parameters<
        typeof shim.toJsx
      >[0])
    ).toThrow(/`body` must be an array/);
  });

  it('round-trips a prop whose name is not an attribute name', () => {
    const composition = {
      type: 'view' as const,
      body: [{ type: 'note', 'not an attribute': 'x' } as PrimitiveNode],
    };
    expect(roundTrip(composition)).toEqual(composition);
  });

  it.each(['children', 'key', 'ref'])(
    'refuses a %s prop, which JSX consumes',
    (prop) => {
      const node = { type: 'note', [prop]: 'x' } as PrimitiveNode;
      expect(() => shim.toJsx({ type: 'view', body: [node] })).toThrow(
        new RegExp(`\\\`${prop}\\\``)
      );
    }
  );

  it('refuses a root option that is no JSX component name', () => {
    expect(() =>
      shim.toJsx({ type: 'view', body: [] }, { root: '1bad' })
    ).toThrow(/no JSX component name/);
  });

  it('refuses two types that print as the same component', () => {
    expect(() =>
      buildJsxShim([
        { type: 'note' as const },
        { type: 'Note' as const },
      ] as const)
    ).toThrow(/"note" and "Note" both print as the component Note/);
  });

  it('refuses a primitive type that is no JSX component name', () => {
    const odd = buildJsxShim([{ type: 'odd "type"' as const }] as const);
    expect(() =>
      odd.toJsx({
        type: 'view',
        body: [{ type: 'odd "type"' }],
      })
    ).toThrow(/no JSX component name/);
  });

  it('refuses a __proto__ prop, which JSX cannot carry', () => {
    const node = JSON.parse(
      '{"type": "note", "__proto__": 1}'
    ) as PrimitiveNode;
    expect(() => shim.toJsx({ type: 'view', body: [node] })).toThrow(
      /__proto__/
    );
  });

  it('round-trips nodes nested inside the items of a branded child field', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'group',
          items: [{ title: 'A', body: [{ type: 'note', text: 'inner' }] }],
        } as PrimitiveNode,
      ],
    };
    expect(shim.toJsx(composition)).toContain('<Note text="inner" />');
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('prints a data object whose `type` is registered as data unless the walker reports it as a child', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'stack',
          items: [{ type: 'note', text: 'child' }],
          meta: { type: 'caption', count: 1 },
        } as PrimitiveNode,
      ],
    };
    const jsx = shim.toJsx(composition);
    expect(jsx).toContain("meta={{ type: 'caption', count: 1 }}");
    expect(jsx).toContain('<Note text="child" />');
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('converts a node inside an object prop from another realm', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'pair',
          side: { main: { type: 'note', text: 'main' }, label: 'L' },
        } as PrimitiveNode,
      ],
    };
    expect(shim.toJsx(composition)).toContain('<Note text="main" />');
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('converts a node inside a null-prototype prop object', () => {
    const { Composition, Note, Pair } = shim;
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

  it('round-trips a composition as deep as the parser accepts', () => {
    let node: PrimitiveNode = { type: 'note', text: 'leaf' } as PrimitiveNode;
    for (let level = 0; level < MAX_COMPOSITION_DEPTH; level += 1) {
      node = { type: 'stack', items: [node] } as PrimitiveNode;
    }
    const composition = { type: 'view' as const, body: [node] };
    expect(roundTrip(composition)).toEqual(composition);
  });

  it('refuses a value nested too deep to print, or a cycle, with an IsomerError', () => {
    let deep: Record<string, unknown> = {};
    for (let level = 0; level < 1000; level += 1) {
      deep = { deep };
    }
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const meta of [deep, cyclic]) {
      expectIsomerError(
        () =>
          shim.toJsx({
            type: 'view',
            body: [{ type: 'note', meta } as PrimitiveNode],
          }),
        'INVALID_BODY_NODE'
      );
    }
  });
});
