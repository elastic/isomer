/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import type { ReactNode } from 'react';
import type { DefaultPackTypes, PrimitiveNode } from '@elastic/isomer-sdk';
import { definePrimitive } from '@elastic/isomer-sdk';
import {
  fromChildren,
  fromTextChildren,
  textFromChildren,
} from '@elastic/isomer-sdk/author';
import { transform } from 'esbuild';
import { runInNewContext } from 'vm';
import { z } from 'zod';

import type { CalloutNode, StatGroupNode } from '../fixtures/components_pack';
import { componentsPrimitives } from '../fixtures/components_pack';
import type { JsxTransform } from '../types';

import type { CompiledEvaluator } from './compile_jsx';
import {
  compileCompositionJsx,
  COMPILED_RESULT,
  createShim,
} from './compile_jsx';
import { JSX_TRANSFORM_OPTIONS } from './jsx_transform';
import type { AuthoredSpecReader } from './print_jsx';
import { printCompositionJsx, printNodeJsx, printValue } from './print_jsx';
import { readExamples } from './read_examples';

const transformJsx: JsxTransform = async (source) => {
  const { code } = await transform(source, JSX_TRANSFORM_OPTIONS);
  return code;
};

const evaluate: CompiledEvaluator = (code, scope) => {
  const context: Record<string, unknown> = { ...scope };
  runInNewContext(code, context);
  return context[COMPILED_RESULT];
};

const shim = createShim(componentsPrimitives);
const schemaFor = (type: string) =>
  componentsPrimitives.find((definition) => definition.type === type)?.schema;
const env = { schemaFor, shim };

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
    expect(printNodeJsx(node, { ...env, readSpec: propsOnly })).toBe(
      '<Callout tone="warning" body="Disk full." />'
    );
  });

  it('prints branded text and child fields as children', () => {
    const text: CalloutNode = { type: 'callout', body: 'Disk full.' };
    const stats: StatGroupNode = {
      type: 'statGroup',
      stats: [{ label: 'Hosts', value: { raw: 5 } }],
    };
    expect(printNodeJsx(text, env)).toBe('<Callout>Disk full.</Callout>');
    expect(printNodeJsx(stats, env)).toBe(
      '<StatGroup>\n  <StatGroup.Stat value={{ raw: 5 }}>Hosts</StatGroup.Stat>\n</StatGroup>'
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
      readSpec ? { ...env, readSpec } : env
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
  const snippetEnv = {
    schemaFor: () => snippet.schema,
    shim: createShim([snippet]),
  };

  it.each(['  indented', 'trailing  ', 'a\r\nb', 'a\tb', 'a\rb'])(
    'keeps %j',
    async (code) => {
      const node: SnippetNode = { type: 'snippet', code };
      const source = printCompositionJsx([node], snippetEnv);
      await expect(
        compileCompositionJsx(source, snippetEnv.shim, transformJsx, {
          evaluate,
        })
      ).resolves.toEqual([node]);
    }
  );

  it('prints tabs and carriage returns as expression literals', () => {
    const node: SnippetNode = { type: 'snippet', code: 'a\tb\rc' };
    expect(printNodeJsx(node, snippetEnv)).toBe(
      '<Snippet>{"a\\tb\\rc"}</Snippet>'
    );
  });
});

describe('JSX round trip, dedented source', () => {
  const sourceSchema = z.object({
    type: z.literal('source'),
    code: fromTextChildren(z.string(), { dedent: true }),
  });
  type SourceNode = z.infer<typeof sourceSchema>;

  const source = definePrimitive<
    SourceNode,
    DefaultPackTypes,
    typeof sourceSchema
  >({
    type: 'source',
    catalog: {
      type: 'source',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: sourceSchema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });
  const sourceEnv = {
    schemaFor: () => source.schema,
    shim: createShim([source]),
  };

  it('prints multi-line source as a template literal that reads back', async () => {
    const node: SourceNode = { type: 'source', code: 'a {\n  b;\n\n}' };
    const printed = printCompositionJsx([node], sourceEnv);
    expect(printNodeJsx(node, sourceEnv)).toBe(
      '<Source>\n  {`\n    a {\n      b;\n\n    }\n  `}\n</Source>'
    );
    await expect(
      compileCompositionJsx(printed, sourceEnv.shim, transformJsx, {
        evaluate,
      })
    ).resolves.toEqual([node]);
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
  const boardEnv = { schemaFor: () => board.schema, shim: createShim([board]) };

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
    const source = printCompositionJsx([node], boardEnv);
    await expect(
      compileCompositionJsx(source, boardEnv.shim, transformJsx, {
        evaluate,
      })
    ).resolves.toEqual([node]);
  });

  it('puts text and every child field in children', () => {
    const node: BoardNode = {
      type: 'board',
      title: 'Plan',
      rows: [{ label: 'One' }],
      notes: [{ label: 'Two' }],
    };
    expect(printNodeJsx(node, boardEnv)).toBe(
      '<Board>\n  Plan\n  <Board.Row label="One" />\n  <Board.Note label="Two" />\n</Board>'
    );
  });

  it('puts a child field in children when another is unset', () => {
    const node: BoardNode = { type: 'board', notes: [{ label: 'Two' }] };
    expect(printNodeJsx(node, boardEnv)).toBe(
      '<Board>\n  <Board.Note label="Two" />\n</Board>'
    );
  });
});

describe('JSX round trip, many child fields', () => {
  const fieldNames = Array.from({ length: 24 }, (_, index) => `slot${index}`);
  const entrySchema = z.object({ label: z.string() });
  const wideSchema = z.object({
    type: z.literal('wide'),
    ...Object.fromEntries(
      fieldNames.map((field) => [
        field,
        fromChildren(field, z.array(entrySchema).optional()),
      ])
    ),
  });
  const wide = definePrimitive<
    z.infer<typeof wideSchema>,
    DefaultPackTypes,
    typeof wideSchema
  >({
    type: 'wide',
    catalog: {
      type: 'wide',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: wideSchema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });
  const wideEnv = { schemaFor: () => wide.schema, shim: createShim([wide]) };

  it('prints without enumerating every subset of its fields', async () => {
    const node = {
      type: 'wide',
      ...Object.fromEntries(
        fieldNames.map((field) => [field, [{ label: field }]])
      ),
    } as PrimitiveNode;
    const source = printCompositionJsx([node], wideEnv);

    expect(source).toContain('<Wide.Slot23 label="slot23" />');
    await expect(
      compileCompositionJsx(source, wideEnv.shim, transformJsx, { evaluate })
    ).resolves.toEqual([node]);
  });
});

describe('JSX round trip, a member name two primitives share', () => {
  const catalog = (type: string) => ({
    type,
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  });
  const renderers = { react: () => null, text: () => '', markdown: () => [] };
  const primitives = [
    definePrimitive<PrimitiveNode>({
      type: 'menu',
      catalog: catalog('menu'),
      examples: [],
      schema: z.object({
        type: z.literal('menu'),
        items: fromChildren('item', z.array(z.object({ label: z.string() })), {
          text: 'label',
        }),
      }),
      renderers,
    }),
    definePrimitive<PrimitiveNode>({
      type: 'roster',
      catalog: catalog('roster'),
      examples: [],
      schema: z.object({
        type: z.literal('roster'),
        items: fromChildren(
          'item',
          z.array(z.object({ name: z.string(), role: z.string() })),
          { text: 'role' }
        ),
      }),
      renderers,
    }),
  ];
  const sharedEnv = {
    schemaFor: (type: string) =>
      primitives.find((primitive) => primitive.type === type)?.schema,
    shim: createShim(primitives),
  };
  const nodes = [
    { type: 'menu', items: [{ label: 'Open' }] },
    { type: 'roster', items: [{ name: 'Ada', role: 'Lead' }] },
  ];

  it('prints each item as its own primitive member and reads it back', async () => {
    const source = printCompositionJsx(nodes, sharedEnv);
    expect(source).toBe(
      [
        '<Composition>',
        '  <Menu>',
        '    <Menu.Item>Open</Menu.Item>',
        '  </Menu>',
        '  <Roster>',
        '    <Roster.Item name="Ada">Lead</Roster.Item>',
        '  </Roster>',
        '</Composition>',
      ].join('\n')
    );
    await expect(
      compileCompositionJsx(source, sharedEnv.shim, transformJsx, { evaluate })
    ).resolves.toEqual(nodes);
  });
});

describe('JSX round trip, custom items and node slots', () => {
  const definition = <TNode extends PrimitiveNode, TSchema extends z.ZodObject>(
    type: string,
    schema: TSchema,
    extra: {
      children?: (node: TNode) => { node: PrimitiveNode; path: string }[];
    } = {}
  ) =>
    definePrimitive<TNode, DefaultPackTypes, TSchema>({
      type,
      catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
      examples: [],
      schema,
      renderers: { react: () => null, text: () => '', markdown: () => [] },
      ...extra,
    });

  const linesSchema = z.object({
    type: z.literal('lines'),
    items: fromChildren('item', z.array(z.string()).optional(), {
      toItem: ({ children }: { children?: ReactNode }) =>
        textFromChildren(children),
    }),
    source: fromChildren(
      'source',
      z.array(z.object({ lines: z.array(z.string()) })).optional(),
      {
        toItem: ({ children }: { children?: ReactNode }) => {
          const all = (typeof children === 'string' ? children : '')
            .split('\n')
            .slice(1, -1);
          const shared = Math.min(
            ...all.filter(Boolean).map((line) => /^ */.exec(line)![0].length)
          );
          return { lines: all.map((line) => line.slice(shared)) };
        },
      }
    ),
    raw: fromChildren(
      'raw',
      z
        .array(z.object({ text: z.string(), op: z.string().optional() }))
        .optional(),
      {
        toItem: ({
          children,
          ...line
        }: {
          children?: ReactNode;
          op?: string;
        }) => ({
          ...line,
          text: typeof children === 'string' ? children : '',
        }),
      }
    ),
  });
  type LinesNode = z.infer<typeof linesSchema>;

  const boxSchema = z.object({
    type: z.literal('box'),
    cover: z.custom<PrimitiveNode>().optional(),
    body: z.array(z.custom<PrimitiveNode>()).optional(),
  });
  type BoxNode = z.infer<typeof boxSchema>;

  const primitives = [
    definition<LinesNode, typeof linesSchema>('lines', linesSchema),
    definition<BoxNode, typeof boxSchema>('box', boxSchema, {
      children: ({ body = [] }) =>
        body.map((node, index) => ({ node, path: `body[${index}]` })),
    }),
  ];
  const customEnv = {
    schemaFor: (type: string) =>
      primitives.find((primitive) => primitive.type === type)?.schema,
    shim: createShim(primitives),
  };

  const lines: LinesNode = {
    type: 'lines',
    items: ['One **point**.', 'Two'],
    source: [{ lines: ['const a = `b`;', '', '  return a;'] }],
    raw: [{ text: '  indented', op: 'add' }, { text: '' }],
  };
  const cover: LinesNode = { type: 'lines', items: ['Cover'] };
  const box: BoxNode = { type: 'box', cover, body: [lines] };

  it.each<[string, PrimitiveNode]>([
    ['custom items', lines],
    ['a node slot and a node prop', box],
  ])('round-trips %s', async (_case, node) => {
    const source = printCompositionJsx([node], customEnv);
    await expect(
      compileCompositionJsx(source, customEnv.shim, transformJsx, { evaluate })
    ).resolves.toEqual([node]);
  });

  it('prints custom items, source, and exact lines as children', () => {
    expect(printNodeJsx(lines, customEnv)).toBe(
      [
        '<Lines>',
        '  <Lines.Item>One **point**.</Lines.Item>',
        '  <Lines.Item>Two</Lines.Item>',
        '  <Lines.Source>',
        '    {`',
        '      const a = \\`b\\`;',
        '',
        '        return a;',
        '    `}',
        '  </Lines.Source>',
        '  <Lines.Raw op="add">{"  indented"}</Lines.Raw>',
        '  <Lines.Raw />',
        '</Lines>',
      ].join('\n')
    );
  });

  it('prints a node slot as children and a node prop as JSX', () => {
    expect(printNodeJsx(box, customEnv)).toMatch(
      /^<Box\n {2}cover=\{\n {4}<Lines>\n {6}<Lines\.Item>Cover<\/Lines\.Item>\n {4}<\/Lines>\n {2}\}\n>\n {2}<Lines>/
    );
  });
});
