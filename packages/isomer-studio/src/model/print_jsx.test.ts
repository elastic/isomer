/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import type { DefaultPackTypes, PrimitiveNode } from '@elastic/isomer-sdk';
import { definePrimitive } from '@elastic/isomer-sdk';
import { fromChildren, fromTextChildren } from '@elastic/isomer-sdk/author';
import { transform } from 'esbuild';
import { runInNewContext } from 'vm';
import { z } from 'zod';

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

  it('keeps an own __proto__ key as data', () => {
    const value: unknown = JSON.parse('{"__proto__": { "x": 1 }}');
    const printed = printValue(value);
    const context: Record<string, unknown> = {};
    runInNewContext(`result = ${printed}`, context);

    expect(printed).toBe('{ ["__proto__"]: { x: 1 } }');
    expect(JSON.stringify(context.result)).toBe(JSON.stringify(value));
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
  const roundTrip = async (node: PrimitiveNode) => {
    const source = printCompositionJsx(
      [node],
      schemaFor,
      readSpec ? { readSpec } : undefined
    );
    await expect(
      compileCompositionJsx(source, shim, transformJsx, { evaluate })
    ).resolves.toEqual([node]);
  };

  it.each(examples)('%s', async (_name, node) => {
    await roundTrip(node);
  });

  it.each([
    ['an entity sequence', 'Tom &amp; Jerry'],
    ['a carriage return', 'line one\rline two'],
    ['surrounding whitespace', '  padded  '],
  ])('keeps text with %s', async (_case, body) => {
    const node: CalloutNode = { type: 'callout', body };
    await roundTrip(node);
  });
});

describe('JSX round trip, whitespace-preserving text', () => {
  const snippetSchema = z.object({
    type: z.literal('snippet'),
    code: fromTextChildren(z.string(), { collapseWhitespace: false }),
  });
  type SnippetNode = z.infer<typeof snippetSchema>;

  const snippet = definePrimitive<
    SnippetNode,
    DefaultPackTypes,
    typeof snippetSchema
  >({
    type: 'snippet',
    catalog: {
      type: 'snippet',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: snippetSchema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });

  it.each(['  indented', 'trailing  ', 'a\r\nb', 'a\tb', 'a\rb'])(
    'keeps %j',
    async (code) => {
      const node: SnippetNode = { type: 'snippet', code };
      const source = printCompositionJsx([node], () => snippet.schema);
      await expect(
        compileCompositionJsx(source, createShim([snippet]), transformJsx, {
          evaluate,
        })
      ).resolves.toEqual([node]);
    }
  );

  it('prints tabs and carriage returns as expression literals', () => {
    const node: SnippetNode = { type: 'snippet', code: 'a\tb\rc' };
    expect(printNodeJsx(node, () => snippet.schema)).toBe(
      '<Snippet>{"a\\tb\\rc"}</Snippet>'
    );
  });
});

describe('JSX round trip, several child fields', () => {
  const entrySchema = z.object({ label: z.string() });
  const boardSchema = z.object({
    type: z.literal('board'),
    title: fromTextChildren(z.string().optional()),
    rows: fromChildren('row', z.array(entrySchema).optional()),
    notes: fromChildren('note', z.array(entrySchema).optional()),
  });
  type BoardNode = z.infer<typeof boardSchema>;

  const board = definePrimitive<
    BoardNode,
    DefaultPackTypes,
    typeof boardSchema
  >({
    type: 'board',
    catalog: {
      type: 'board',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: boardSchema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });

  it.each<[string, BoardNode]>([
    [
      'every field set',
      {
        type: 'board',
        title: 'Plan',
        rows: [{ label: 'One' }],
        notes: [{ label: 'Two' }],
      },
    ],
    [
      'two child fields',
      { type: 'board', rows: [{ label: 'One' }], notes: [{ label: 'Two' }] },
    ],
    ['one child field', { type: 'board', rows: [{ label: 'One' }] }],
    ['text alone', { type: 'board', title: 'Plan' }],
  ])('round-trips %s', async (_case, node) => {
    const source = printCompositionJsx([node], () => board.schema);
    await expect(
      compileCompositionJsx(source, createShim([board]), transformJsx, {
        evaluate,
      })
    ).resolves.toEqual([node]);
  });

  it('puts one field in children when the others are set as props', () => {
    const node: BoardNode = {
      type: 'board',
      title: 'Plan',
      rows: [{ label: 'One' }],
      notes: [{ label: 'Two' }],
    };
    expect(printNodeJsx(node, () => board.schema)).toBe(
      '<Board rows={[{ label: "One" }]} notes={[{ label: "Two" }]}>Plan</Board>'
    );
  });
});
