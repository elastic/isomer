/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInThisContext } from 'node:vm';

import { createElement, type ReactElement } from 'react';
import type { Composition } from '@elastic/isomer-sdk';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { SlideContentNode } from './body_node';
import { deck } from './examples/worked_example';
import type { SlideFrameNode } from './primitives/slide_frame/types';
import { slideDeckPrimitives } from './registry';

const shim = buildJsxShim(slideDeckPrimitives);
const components = Object.entries(shim).filter(
  ([name]) =>
    name !== 'toComposition' && name !== 'toJsx' && name !== 'component'
);

/** Compiles printed JSX and runs it against the shim's components. */
const evaluate = (jsx: string): ReactElement => {
  const { outputText } = ts.transpileModule(`(${jsx})`, {
    compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'h' },
  });
  // In this realm, so object literals pass the shim's plain-object check.
  const run = runInThisContext(
    `(h, ${components.map(([name]) => name).join(', ')}) => ${outputText.trim().replace(/;$/, '')}`
  ) as (...args: unknown[]) => ReactElement;
  return run(createElement, ...components.map(([, component]) => component));
};

const roundTrip = (composition: Composition) =>
  shim.toComposition(
    evaluate(shim.toJsx(composition)) as Parameters<
      typeof shim.toComposition
    >[0]
  );

const framed = (node: SlideContentNode): Composition => {
  const frame: SlideFrameNode = { type: 'slideFrame', body: [node] };
  return { type: 'view', title: 'Example', body: [frame] };
};

describe('toJsx', () => {
  it.each(
    slideDeckPrimitives.flatMap(({ type, examples }) =>
      examples.map((example, index) => [`${type} #${index}`, example] as const)
    )
  )('round-trips %s', (_name, example) => {
    const composition =
      example.type === 'slideFrame'
        ? ({ type: 'view', body: [example] } as Composition)
        : framed(example);
    expect(roundTrip(composition)).toEqual(composition);
  });

  it.each(deck.map((composition) => [composition.title, composition] as const))(
    'round-trips the example slide %s',
    (_title, composition) => {
      expect(roundTrip(composition)).toEqual(composition);
    }
  );

  it('prints the frame body as children and everything else as props', () => {
    const frame: SlideFrameNode = {
      type: 'slideFrame',
      url: 'https://example.com',
      body: [{ type: 'slideHeading', title: 'Quote "this" & that' }],
    };
    expect(
      shim.toJsx(
        { type: 'view', title: 'Slide', body: [frame] },
        { root: 'Slide' }
      )
    ).toMatchInlineSnapshot(`
      "<Slide title="Slide">
        <SlideFrame url="https://example.com">
          <SlideHeading title={'Quote "this" & that'} />
        </SlideFrame>
      </Slide>"
    `);
  });
});
