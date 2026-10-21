/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from 'react';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'vm';
import { z } from 'zod';

import type {
  DefaultPackTypes,
  PrimitiveNode,
} from '../define/primitive_module';
import { definePrimitive } from '../define/primitive_module';

import { fromChildren, fromTextChildren } from './authored_fields';
import type { CompositionAuthorProps, JsxShim } from './jsx_shim';
import { buildJsxShim, textFromChildren } from './jsx_shim';
import type { PrintJsxEnv } from './print_jsx';
import { printCompositionJsx, printNodeJsx, printValue } from './print_jsx';

/** Compiles authoring JSX against `shim`'s components and returns its body. */
const compileJsx = (source: string, shim: JsxShim): PrimitiveNode[] => {
  const { outputText } = ts.transpileModule(`result = ${source};`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
      target: ts.ScriptTarget.ES2022,
    },
  });
  const context: Record<string, unknown> = {
    ...shim,
    h: createElement,
    Fragment,
  };
  runInNewContext(outputText, context);
  return shim.toComposition(
    context.result as ReactElement<CompositionAuthorProps>
  ).body;
};

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

const calloutSchema = z.object({
  type: z.literal('callout'),
  title: z.string().optional(),
  body: fromTextChildren(z.string()),
  tone: z.enum(['primary', 'warning']).optional(),
});
type CalloutNode = z.infer<typeof calloutSchema>;

const statGroupSchema = z.object({
  type: z.literal('statGroup'),
  label: z.string().optional(),
  stats: fromChildren(
    'stat',
    z.array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.object({ raw: z.number() })]),
        tone: z.enum(['danger', 'warning']).optional(),
        delta: z.object({ label: z.string() }).optional(),
      })
    ),
    { text: 'label' }
  ),
});
type StatGroupNode = z.infer<typeof statGroupSchema>;

const fixtures = [
  definition<CalloutNode, typeof calloutSchema>('callout', calloutSchema),
  definition<StatGroupNode, typeof statGroupSchema>(
    'statGroup',
    statGroupSchema
  ),
];
const shim = buildJsxShim(fixtures);
const schemaFor = (type: string) =>
  fixtures.find((fixture) => fixture.type === type)?.schema;
const env = { schemaFor, shim };

const examples: [string, CalloutNode | StatGroupNode][] = [
  [
    'a callout with every field',
    {
      type: 'callout',
      tone: 'warning',
      title: 'Error rate spiked',
      body: 'web-prod-04 saw a 4x jump in 5xx responses over the last hour.',
    },
  ],
  ['a callout with only a body', { type: 'callout', body: 'Disk full.' }],
  [
    'a labelled stat group',
    {
      type: 'statGroup',
      label: 'Summary',
      stats: [
        { label: 'Hosts', value: { raw: 5 } },
        { label: 'Total errors', value: { raw: 12847 }, tone: 'danger' },
      ],
    },
  ],
  [
    'a stat with a nested object',
    {
      type: 'statGroup',
      stats: [
        {
          label: 'Tests',
          value: '1963',
          delta: { label: '+12 since yesterday' },
        },
      ],
    },
  ],
];

const propsOnly: PrintJsxEnv['readSpec'] = () => undefined;

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

describe('printCompositionJsx', () => {
  const body: CalloutNode[] = [{ type: 'callout', body: 'Disk full.' }];

  it('prints no props without a root', () => {
    expect(printCompositionJsx(body, env)).toBe(
      '<Composition>\n  <Callout>Disk full.</Callout>\n</Composition>'
    );
    expect(printCompositionJsx(body, env, { root: {} })).toBe(
      printCompositionJsx(body, env)
    );
  });

  it('keeps the root fields with an empty body', () => {
    expect(printCompositionJsx([], env, { root: { title: 'Empty' } })).toBe(
      '<Composition title="Empty" />'
    );
  });

  it('prints a Unicode identifier type as a tag that reads back', () => {
    const cafeSchema = z.object({
      type: z.literal('café'),
      label: z.string(),
    });
    const cafe = definition<z.infer<typeof cafeSchema>, typeof cafeSchema>(
      'café',
      cafeSchema
    );
    const cafeEnv = {
      schemaFor: () => cafe.schema,
      shim: buildJsxShim([cafe]),
    };
    const node = { type: 'café', label: 'Ouvert' };
    const source = printCompositionJsx([node], cafeEnv);
    expect(source).toContain('<Café label="Ouvert" />');
    expect(compileJsx(source, cafeEnv.shim)).toEqual([node]);
  });

  it('refuses a type that cannot be a JSX tag', () => {
    const node = { type: 'callout /><X' } as unknown as PrimitiveNode;
    expect(() => printCompositionJsx([node], env)).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_PRIMITIVE_TYPE' })
    );
  });

  it('prints a key that is not an attribute name as a quoted spread', () => {
    const node = {
      type: 'callout',
      body: 'Hi.',
      'p={globalThis.pwned=1} q': 'x',
    } as unknown as PrimitiveNode;
    const source = printCompositionJsx([node], {
      ...env,
      readSpec: propsOnly,
    });
    expect(source).toContain('{...{ "p={globalThis.pwned=1} q": "x" }}');

    const { outputText } = ts.transpileModule(`result = ${source};`, {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        jsxFactory: 'h',
        jsxFragmentFactory: 'Fragment',
        target: ts.ScriptTarget.ES2022,
      },
    });
    const context: Record<string, unknown> = {
      ...shim,
      h: createElement,
      Fragment,
    };
    runInNewContext(outputText, context);
    expect(context.pwned).toBeUndefined();
  });

  it('prints the root fields as props that read back', () => {
    const root = {
      title: 'Hosts',
      theme: 'dark' as const,
      meta: { source: 'agent', freshness: { stale: true } },
    };
    const source = printCompositionJsx(body, env, { root });
    expect(source).toMatch(
      /^<Composition\n {2}title="Hosts"\n {2}theme="dark"/
    );

    const { outputText } = ts.transpileModule(`result = ${source};`, {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        jsxFactory: 'h',
        jsxFragmentFactory: 'Fragment',
        target: ts.ScriptTarget.ES2022,
      },
    });
    const context: Record<string, unknown> = {
      ...shim,
      h: createElement,
      Fragment,
    };
    runInNewContext(outputText, context);
    expect(
      shim.toComposition(context.result as ReactElement<CompositionAuthorProps>)
    ).toEqual({ type: 'view', body, ...root });
  });
});

describe.each([
  ['props only', propsOnly],
  ['with the authored spec', undefined],
])('JSX round trip, %s', (_mode, readSpec) => {
  const roundTrip = (node: PrimitiveNode) => {
    const source = printCompositionJsx(
      [node],
      readSpec ? { ...env, readSpec } : env
    );
    expect(compileJsx(source, shim)).toEqual([node]);
  };

  it.each(examples)('%s', (_name, node) => {
    roundTrip(node);
  });

  it.each([
    ['an entity sequence', 'Tom &amp; Jerry'],
    ['a carriage return', 'line one\rline two'],
    ['surrounding whitespace', '  padded  '],
  ])('keeps text with %s', (_case, body) => {
    const node: CalloutNode = { type: 'callout', body };
    roundTrip(node);
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
    shim: buildJsxShim([snippet]),
  };

  it.each(['  indented', 'trailing  ', 'a\r\nb', 'a\tb', 'a\rb'])(
    'keeps %j',
    (code) => {
      const node: SnippetNode = { type: 'snippet', code };
      const source = printCompositionJsx([node], snippetEnv);
      expect(compileJsx(source, snippetEnv.shim)).toEqual([node]);
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
    shim: buildJsxShim([source]),
  };

  it('prints multi-line source as a template literal that reads back', () => {
    const node: SourceNode = { type: 'source', code: 'a {\n  b;\n\n}' };
    const printed = printCompositionJsx([node], sourceEnv);
    expect(printNodeJsx(node, sourceEnv)).toBe(
      '<Source>\n  {`\n    a {\n      b;\n\n    }\n  `}\n</Source>'
    );
    expect(compileJsx(printed, sourceEnv.shim)).toEqual([node]);
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
  const boardEnv = {
    schemaFor: () => board.schema,
    shim: buildJsxShim([board]),
  };

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
  ])('round-trips %s', (_case, node) => {
    const source = printCompositionJsx([node], boardEnv);
    expect(compileJsx(source, boardEnv.shim)).toEqual([node]);
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
  const wide = definition<z.infer<typeof wideSchema>, typeof wideSchema>(
    'wide',
    wideSchema
  );
  const wideEnv = {
    schemaFor: () => wide.schema,
    shim: buildJsxShim([wide]),
  };

  it('prints without enumerating every subset of its fields', () => {
    const node = {
      type: 'wide',
      ...Object.fromEntries(
        fieldNames.map((field) => [field, [{ label: field }]])
      ),
    } as PrimitiveNode;
    const source = printCompositionJsx([node], wideEnv);

    expect(source).toContain('<Wide.Slot23 label="slot23" />');
    expect(compileJsx(source, wideEnv.shim)).toEqual([node]);
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
    shim: buildJsxShim(primitives),
  };
  const nodes = [
    { type: 'menu', items: [{ label: 'Open' }] },
    { type: 'roster', items: [{ name: 'Ada', role: 'Lead' }] },
  ];

  it('prints each item as its own primitive member and reads it back', () => {
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
    expect(compileJsx(source, sharedEnv.shim)).toEqual(nodes);
  });
});

describe('JSX round trip, custom items and node slots', () => {
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
    shim: buildJsxShim(primitives),
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
  ])('round-trips %s', (_case, node) => {
    const source = printCompositionJsx([node], customEnv);
    expect(compileJsx(source, customEnv.shim)).toEqual([node]);
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
