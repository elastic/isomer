/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInThisContext } from 'node:vm';

import { createElement, type ReactElement } from 'react';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { PrimitiveNode } from '../define/primitive_module';

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
] as const;

const shim = buildJsxShim(primitives);
const components = Object.entries(shim).filter(
  ([name]) =>
    name !== 'toComposition' && name !== 'toJsx' && name !== 'component'
);

/** Compiles printed JSX and runs it against the shim's components, as an author's file would. */
const roundTrip = (composition: Parameters<typeof shim.toJsx>[0]) => {
  const { outputText } = ts.transpileModule(`(${shim.toJsx(composition)})`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      target: ts.ScriptTarget.ES2022,
    },
  });
  // In this realm, so object literals pass the shim's plain-object check.
  const run = runInThisContext(
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
  '',
];

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
});
