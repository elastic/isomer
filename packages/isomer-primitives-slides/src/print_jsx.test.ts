/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactElement } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { primitiveExamples } from '@elastic/isomer-sdk';
import type { CompositionAuthorProps } from '@elastic/isomer-sdk/author';
import {
  printCompositionJsx,
  readAuthoredSpec,
} from '@elastic/isomer-sdk/author';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'vm';

import { slideJsx } from './jsx';
import { slideDeckPrimitives } from './registry';

const compileJsx = (source: string): PrimitiveNode[] => {
  const { outputText } = ts.transpileModule(`result = ${source};`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
      target: ts.ScriptTarget.ES2022,
    },
  });
  const context: Record<string, unknown> = {
    ...slideJsx,
    h: createElement,
    Fragment,
  };
  runInNewContext(outputText, context);
  return slideJsx.toComposition(
    context.result as ReactElement<CompositionAuthorProps>
  ).body;
};

/** The attribute names on the first element inside `<Composition>`. */
const rootAttributes = (source: string): string[] => {
  const file = ts.createSourceFile(
    'printed.tsx',
    source,
    ts.ScriptTarget.ES2022,
    false,
    ts.ScriptKind.TSX
  );
  const [statement] = file.statements;
  const composition =
    statement && ts.isExpressionStatement(statement)
      ? statement.expression
      : undefined;
  const root =
    composition && ts.isJsxElement(composition)
      ? composition.children.find(
          (child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)
        )
      : undefined;
  if (!root) {
    return [];
  }
  const { attributes } = ts.isJsxElement(root) ? root.openingElement : root;
  return attributes.properties.flatMap((attribute) =>
    ts.isJsxAttribute(attribute) ? [attribute.name.getText(file)] : []
  );
};

const env = {
  schemaFor: (type: string) =>
    slideDeckPrimitives.find((primitive) => primitive.type === type)?.schema,
  shim: slideJsx,
};

const examples = slideDeckPrimitives.flatMap((primitive) =>
  primitiveExamples(primitive).map(
    ({ node }, index): [string, PrimitiveNode] => [
      `${primitive.type} ${index + 1}`,
      node,
    ]
  )
);

describe('printCompositionJsx over the slides pack', () => {
  it.each(examples)('round-trips %s', (_name, node) => {
    expect(compileJsx(printCompositionJsx([node], env))).toEqual([node]);
  });

  it.each(examples)('prints %s in children as the deck does', (_name, node) => {
    const printed = printCompositionJsx([node], env);
    const schema = env.schemaFor(node.type);
    const {
      children = [],
      nodes = [],
      text = [],
    } = (schema && readAuthoredSpec(schema)) ?? {};

    expect(printed).not.toMatch(/\btype: "/);
    const branded = new Set(
      [...children, ...nodes, ...text].map(({ field }) => field)
    );
    expect(rootAttributes(printed).filter((name) => branded.has(name))).toEqual(
      []
    );
  });
});
