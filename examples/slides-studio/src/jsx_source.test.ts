/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInNewContext } from 'node:vm';

import { createElement, type ReactElement } from 'react';
import {
  slideDeckPrimitives,
  slideJsx,
} from '@elastic/isomer-primitives-slides';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { jsxSource } from './jsx_source';

const components = Object.entries(slideJsx).filter(
  ([name]) => name !== 'toComposition' && name !== 'component'
);

/** Compiles printed JSX and runs it against the pack's components, as an author's file would. */
const reparse = (source: string): Composition => {
  const { outputText } = ts.transpileModule(`(${source})`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      target: ts.ScriptTarget.ES2022,
    },
  });
  const run = runInNewContext(
    `(h, ${components.map(([name]) => name).join(', ')}) => ${outputText.trim().replace(/;$/, '')}`
  ) as (...args: unknown[]) => ReactElement;
  return slideJsx.toComposition(
    run(
      createElement,
      ...components.map(([, component]) => component)
    ) as Parameters<typeof slideJsx.toComposition>[0]
  );
};

const framed = (node: object): Composition => ({
  type: 'view',
  title: 'Slide',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

describe('jsxSource', () => {
  it.each(
    slideDeckPrimitives
      .filter(({ type }) => type !== 'slideFrame')
      .flatMap(({ examples }) =>
        examples.map((node): [string, object] => [node.type, node])
      )
  )('prints a %s example as JSX that reads back to it', (_type, node) => {
    const composition = framed(node);
    expect(reparse(jsxSource(composition))).toEqual(composition);
  });

  it.each([
    'say "hi"',
    'a {b} <c> & d',
    'line\nbreak and \r return',
    'separators   and  ',
    'back\\slash',
    'lone \uD800 surrogate',
    'é and 漢 and 🙂',
  ])('keeps %j intact', (title) => {
    const composition = framed({ type: 'slideHeading', title });
    expect(reparse(jsxSource(composition))).toEqual(composition);
  });

  it('prints nested nodes as elements and puts props JSX cannot name in a spread', () => {
    const source = jsxSource(
      framed({
        type: 'slideHeading',
        title: 'T',
        'data-x': 1,
        'a b': 2,
        key: 3,
      }),
      { root: 'Slide' }
    );
    expect(source).toMatch(/^<Slide title="Slide">/);
    expect(source).toContain('<SlideFrame>');
    expect(source).toContain('data-x={1}');
    expect(source).toMatch(/\{\.\.\.\{\s*"a b": 2,\s*key: 3\s*\}\}/);
  });
});
