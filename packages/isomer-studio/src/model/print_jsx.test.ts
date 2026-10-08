/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import { transform } from 'esbuild';
import { runInNewContext } from 'vm';

import type { CalloutNode, StatGroupNode } from '../fixtures/components_pack';
import { componentsPrimitives } from '../fixtures/components_pack';
import type { JsxTransform } from '../types';

import type { CompiledEvaluator } from './compile_jsx';
import { compileCompositionJsx, createShim } from './compile_jsx';
import type { AuthoredSpecReader } from './print_jsx';
import { printCompositionJsx, printNodeJsx, printValue } from './print_jsx';
import { readExamples } from './read_examples';

const transformJsx: JsxTransform = async (source) => {
  const { code } = await transform(source, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  });
  return code;
};

const evaluate: CompiledEvaluator = (code, scope) => {
  const context: Record<string, unknown> = { ...scope };
  runInNewContext(code, context);
  return context.__isomerStudioResult;
};

const shim = createShim(componentsPrimitives);
const schemaFor = (type: string) =>
  componentsPrimitives.find((definition) => definition.type === type)?.schema;

const examples = componentsPrimitives.flatMap((definition) =>
  readExamples(definition).map(({ name, node }): [string, typeof node] => [
    `${definition.type} ${name}`,
    node,
  ])
);

const propsOnly: AuthoredSpecReader = () => undefined;

describe('printValue', () => {
  it('keeps short values on one line', () => {
    expect(printValue({ raw: 5 })).toBe('{ raw: 5 }');
    expect(printValue(['a', 'b'])).toBe('["a", "b"]');
  });

  it('quotes keys that are not identifiers', () => {
    expect(printValue({ 'data-x': 1 })).toBe('{ "data-x": 1 }');
  });
});

describe('printNodeJsx', () => {
  it('prints every field as a prop when the schema has no spec', () => {
    const node: CalloutNode = {
      type: 'callout',
      tone: 'warning',
      body: 'Disk full.',
    };
    expect(printNodeJsx(node, schemaFor, { readSpec: propsOnly })).toBe(
      '<Callout tone="warning" body="Disk full." />'
    );
  });

  it('prints branded text and child fields as children', () => {
    const text: CalloutNode = { type: 'callout', body: 'Disk full.' };
    const stats: StatGroupNode = {
      type: 'statGroup',
      stats: [{ label: 'Hosts', value: { raw: 5 } }],
    };
    expect(printNodeJsx(text, schemaFor)).toBe('<Callout>Disk full.</Callout>');
    expect(printNodeJsx(stats, schemaFor)).toBe(
      '<StatGroup>\n  <Stat value={{ raw: 5 }}>Hosts</Stat>\n</StatGroup>'
    );
  });
});

describe.each([
  ['props only', propsOnly],
  ['with the authored spec', undefined],
])('JSX round trip, %s', (_mode, readSpec) => {
  it.each(examples)('%s', async (_name, node) => {
    const source = printCompositionJsx(
      [node],
      schemaFor,
      readSpec ? { readSpec } : undefined
    );
    await expect(
      compileCompositionJsx(source, shim, transformJsx, { evaluate })
    ).resolves.toEqual([node]);
  });
});
