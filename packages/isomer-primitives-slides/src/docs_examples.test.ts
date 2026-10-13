/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileFunction } from 'node:vm';

import { Children, createElement, Fragment, isValidElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { slideJsx } from './jsx';
import { slideDeckFrame, slidesPack } from './pack';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const docs = join(__dirname, '..', 'docs');

// A block is either sibling elements or a program whose JSX is one `<Composition>`.
const examples = readdirSync(docs)
  .filter((file) => file.endsWith('.md'))
  .flatMap((file) =>
    [
      ...readFileSync(join(docs, file), 'utf8').matchAll(
        /^```tsx\n([\s\S]*?)^```/gm
      ),
    ].map(([, block = ''], index) => ({
      name: `${file} #${index + 1}`,
      jsx: /^<[A-Z]/.test(block)
        ? block
        : block.match(/<Composition[\s\S]*<\/Composition>/)?.[0],
    }))
  )
  .filter((example): example is { name: string; jsx: string } => !!example.jsx);

const evaluate = (jsx: string): unknown => {
  const { outputText } = ts.transpileModule(`(<>${jsx}</>)`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'createElement',
      jsxFragmentFactory: 'Fragment',
    },
  });
  // The docs assume every `slideJsx` component is in scope by name.
  const scope = { ...slideJsx, createElement, Fragment };
  const run = compileFunction(`return ${outputText}`, Object.keys(scope)) as (
    ...args: unknown[]
  ) => unknown;
  return run(...Object.values(scope));
};

describe('docs examples', () => {
  it('finds the JSX examples', () => {
    expect(examples.length).toBeGreaterThan(5);
  });

  it.each(examples)('$name validates', ({ jsx }) => {
    const fragment = evaluate(jsx) as { props: { children: unknown } };
    const errors = Children.toArray(fragment.props.children as never)
      .filter(isValidElement)
      .flatMap((element) => {
        const composition = slideJsx.toComposition(
          element.type === slideJsx.Composition
            ? (element as Parameters<typeof slideJsx.toComposition>[0])
            : createElement(slideJsx.Composition, null, element)
        );
        return runtime
          .validate(composition)
          .errors.map(({ path, message }) => `${path}: ${message}`);
      });
    expect(errors).toEqual([]);
  });
});
