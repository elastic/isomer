/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';

import {
  type AnyPrimitiveDefinition,
  definePrimitive,
  type PrimitiveNode,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';
import {
  authoringBodySchema,
  buildAuthoringJsonSchema,
} from '../validate/authoring_schema';

import { fromChildren, fromTextChildren } from './authored_fields';
import { buildAuthoringDeclarations } from './declarations';
import { defineAuthorComponent } from './jsx';
import { buildJsxShim } from './jsx_shim';

const renderers = { react: () => null, text: () => '', markdown: () => [] };

const entry = (
  type: string,
  overrides: Partial<{
    purpose: string;
    useWhen: string[];
    avoidWhen: string[];
  }> = {}
) => ({
  type,
  purpose: '',
  useWhen: [],
  avoidWhen: [],
  example: {},
  ...overrides,
});

const note: AnyPrimitiveDefinition = definePrimitive<PrimitiveNode>({
  type: 'note',
  catalog: entry('note', {
    purpose: 'A line of text.',
    useWhen: ['A caption is enough.'],
    avoidWhen: ['The text needs a heading; use `section`.'],
  }),
  examples: [],
  schema: z.object({
    type: z.literal('note'),
    text: z.string().min(1).describe('What to say.'),
    tone: z.enum(['info', 'warn']).optional(),
  }),
  renderers,
});

const badgeItem = z.object({
  label: z.string().describe('Badge text.'),
  tone: z.enum(['info', 'warn']).optional(),
});

const badges: AnyPrimitiveDefinition = definePrimitive<PrimitiveNode>({
  type: 'badges',
  catalog: entry('badges', { purpose: 'A row of badges.' }),
  examples: [],
  schema: z.object({
    type: z.literal('badges'),
    items: fromChildren('badge', z.array(badgeItem).min(1), { text: 'label' }),
  }),
  renderers,
});

const callout: AnyPrimitiveDefinition = definePrimitive<PrimitiveNode>({
  type: 'callout',
  catalog: entry('callout', { purpose: 'A boxed message.' }),
  examples: [],
  schema: z.object({
    type: z.literal('callout'),
    body: fromTextChildren(z.string().min(1)),
    icon: z.string().optional(),
  }),
  renderers,
});

interface StackNode extends PrimitiveNode {
  type: 'stack';
  items: PrimitiveNode[];
  gap?: number;
}

const stack: AnyPrimitiveDefinition = definePrimitive<StackNode>({
  type: 'stack',
  catalog: entry('stack', { purpose: 'Nodes in a column.' }),
  examples: [],
  schema: z.object({
    type: z.literal('stack'),
    items: z.array(unresolvedBodyNodeSchema).min(1),
    gap: z.number().optional(),
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({
      type: z.literal('stack'),
      items: z.array(bodyNodeSchema).min(1),
      gap: z.number().optional(),
    }),
  children: (node) =>
    node.items.map((item, index) => ({ node: item, path: `items[${index}]` })),
  renderers,
});

const definitions = [note, badges, callout, stack];
const schema = buildAuthoringJsonSchema(definitions);

const diagnostics = (
  files: Record<string, string>,
  compilerOptions: ts.CompilerOptions = {}
): string[] => {
  const declarationText = files['/virtual/isomer.d.ts'] ?? '';
  const moduleText = declarationText.slice(
    declarationText.indexOf('declare module')
  );
  const names = [
    ...moduleText.matchAll(/^ {2}(?:interface|type|const|function) (\w+)/gm),
  ].map((match) => match[1]);
  files = Object.fromEntries(
    Object.entries(files).map(([name, text]) => [
      name,
      declarationText && name.endsWith('.tsx')
        ? `import { ${names.join(', ')} } from '@elastic/isomer-authoring';\n${text}`
        : text,
    ])
  );
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    jsx: ts.JsxEmit.Preserve,
    ...(compilerOptions.jsx === ts.JsxEmit.ReactJSX ||
    compilerOptions.jsx === ts.JsxEmit.ReactJSXDev
      ? {}
      : { jsxFactory: 'authorJsx' }),
    target: ts.ScriptTarget.ES2022,
    types: [],
    ...compilerOptions,
  };
  const base = ts.createCompilerHost(options);
  const host: ts.CompilerHost = {
    ...base,
    getSourceFile: (name, languageVersion, ...rest) =>
      files[name] === undefined
        ? base.getSourceFile(name, languageVersion, ...rest)
        : ts.createSourceFile(name, files[name], languageVersion),
    fileExists: (name) => files[name] !== undefined || base.fileExists(name),
    readFile: (name) => files[name] ?? base.readFile(name),
  };
  const program = ts.createProgram(Object.keys(files), options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map(({ messageText }) =>
      ts.flattenDiagnosticMessageText(messageText, ' ')
    );
};

describe('buildAuthoringDeclarations', () => {
  it('declares one node type per primitive, with its catalog text as JSDoc', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions);

    expect(declarations).toContain('interface NoteNode {');
    expect(declarations).toContain(' * A line of text.');
    expect(declarations).toContain(' * - A caption is enough.');
    expect(declarations).toContain(
      ' * - The text needs a heading; use `section`.'
    );
    expect(declarations).toContain('/** What to say. */\n    text: string;');
    expect(declarations).toContain('tone?: "info" | "warn";');
  });

  it('unions the node types as BodyNode and points containers at it', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions);

    expect(declarations).toContain(
      'type BodyNode =\n    | NoteNode\n    | BadgesNode\n    | CalloutNode\n    | StackNode;'
    );
    expect(declarations).toContain('items: BodyNode[];');
  });

  it('declares nothing JSX-shaped unless asked', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions);

    expect(declarations).not.toContain('const');
    expect(declarations).not.toContain('JSX');
  });

  it('isolates declarations in an ambient module an editor can load as one lib', () => {
    for (const jsx of [false, true]) {
      const declarations = buildAuthoringDeclarations(schema, definitions, {
        jsx,
      });

      expect(declarations).toContain(
        'declare module "@elastic/isomer-authoring" {'
      );
    }
  });

  it('declares each primitive and branded child as a component with typed props', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });

    expect(declarations).toContain(
      'const Composition: (props: CompositionProps) => null;'
    );
    expect(declarations).toContain('const Note: (props: NoteProps) => null;');
    expect(declarations).toContain('const Badge: (props: BadgeProps) => null;');
    expect(declarations).toMatch(/interface BadgesProps \{\n {4}items\?: \{/);
    expect(declarations).toMatch(
      /interface CalloutProps \{[^]*?body\?: string;/
    );
    expect(declarations).toMatch(
      /interface StackProps \{[^]*?items\?: BodyNode\[\];/
    );
  });

  it('type-checks JSX written the way the shim reads it', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });
    const use = `
      const view = (
        <Composition title="Checkout" theme="dark">
          <Stack gap={2}>
            <Note text="Hi" tone="warn" />
            <Callout icon="info">Heads up</Callout>
            <Badges>
              <Badge tone="info">Open</Badge>
            </Badges>
          </Stack>
          <Badges items={[{ label: 'Done' }]} />
        </Composition>
      );
      const node: BodyNode = { type: 'note', text: 'Hi' };
    `;

    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': use,
      })
    ).toEqual([]);
  });

  it('rejects JSX the shim would reject', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });
    const messages = diagnostics({
      '/virtual/isomer.d.ts': declarations,
      '/virtual/use.tsx': `
        const a = <Note text={3} />;
        const b = <Badge tone="loud">Open</Badge>;
        const c: BodyNode = { type: 'missing' };
      `,
    });

    expect(messages).toHaveLength(3);
  });

  it('suffixes a name another type has claimed', () => {
    const clash = definePrimitive<PrimitiveNode>({
      type: 'Note',
      catalog: entry('Note'),
      examples: [],
      schema: z.object({ type: z.literal('Note') }),
      renderers,
    });
    const both = [note, clash];

    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(both),
      both
    );

    expect(declarations).toContain('interface NoteNode {');
    expect(declarations).toContain('interface NoteNode2 {');
    expect(diagnostics({ '/virtual/isomer.d.ts': declarations })).toEqual([]);
  });

  it('does not redeclare a global with a type or a component', () => {
    const record = z.object({ a: z.string() });
    const image = definePrimitive<PrimitiveNode>({
      type: 'image',
      catalog: entry('image'),
      examples: [],
      schema: z.object({ type: z.literal('image'), meta: record }),
      renderers,
    });
    const defs = [image];

    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs, {
        extraDefs: [{ schema: record, id: 'record' }],
      }),
      defs,
      { jsx: true }
    );

    expect(declarations).toContain('interface Record {');
    expect(declarations).toContain('interface ImageNode {');
    expect(declarations).toContain('const Image:');
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Image meta={{a: "x"}} />;',
      })
    ).toEqual([]);
  });

  it('exposes non-identifier components through the components object', () => {
    const codeBlock = definePrimitive<PrimitiveNode>({
      type: 'code-block',
      catalog: entry('code-block'),
      examples: [],
      schema: z.object({ type: z.literal('code-block') }),
      renderers,
    });
    const defs = [codeBlock];

    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );

    expect(declarations).toContain('interface CodeBlockNode {');
    expect(declarations).toContain('"Code-block":');
    expect(diagnostics({ '/virtual/isomer.d.ts': declarations })).toEqual([]);
  });

  it('accepts the extra props a loose schema accepts', () => {
    const loose = definePrimitive<PrimitiveNode>({
      type: 'loose',
      catalog: entry('loose'),
      examples: [],
      schema: z.looseObject({ type: z.literal('loose'), a: z.string() }),
      renderers,
    });
    const defs = [loose];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );

    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Loose a="x" extra={1} />;',
      })
    ).toEqual([]);
  });

  it('keeps a data field named type on a child item', () => {
    const rows = definePrimitive<PrimitiveNode>({
      type: 'rows',
      catalog: entry('rows'),
      examples: [],
      schema: z.object({
        type: z.literal('rows'),
        items: fromChildren(
          'row',
          z.array(z.object({ type: z.enum(['a', 'b']) }))
        ),
      }),
      renderers,
    });
    const defs = [rows];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );

    expect(declarations).toMatch(
      /interface RowProps \{\n {4}type: "a" \| "b";/
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Rows><Row type="a" /></Rows>;',
      })
    ).toEqual([]);
  });

  it('declares no components beneath a toItem child', () => {
    const tag = z.object({ name: z.string() });
    const card = z.object({
      title: z.string(),
      tags: fromChildren('tag', z.array(tag)),
    });
    const cards = definePrimitive<PrimitiveNode>({
      type: 'cards',
      catalog: entry('cards'),
      examples: [],
      schema: z.object({
        type: z.literal('cards'),
        items: fromChildren('card', z.array(card), {
          toItem(props: { title: string }) {
            return props;
          },
        }),
      }),
      renderers,
    });
    const defs = [cards];

    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );

    expect(declarations).toContain('const Card:');
    expect(declarations).not.toContain('const Tag:');
  });

  it('supports colliding ES and DOM component names with both editor library configurations', () => {
    const defs = [
      'image',
      'record',
      'history',
      'inputEvent',
      'eventTarget',
    ].map((type) =>
      definePrimitive<PrimitiveNode>({
        type,
        catalog: entry(type),
        examples: [],
        schema: z.strictObject({ type: z.literal(type) }),
        renderers,
      })
    );
    const shim = buildJsxShim(defs);
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    const use =
      '<Composition><Image /><Record /><History /><InputEvent /><EventTarget /></Composition>;';
    for (const lib of [
      ['lib.es2020.d.ts'],
      ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    ]) {
      expect(
        diagnostics(
          { '/virtual/isomer.d.ts': declarations, '/virtual/use.tsx': use },
          { lib }
        )
      ).toEqual([]);
    }
    expect(Object.keys(shim)).toEqual(
      expect.arrayContaining([
        'Image',
        'Record',
        'History',
        'InputEvent',
        'EventTarget',
      ])
    );
  });

  it('loads two runtimes through distinct module identities', () => {
    const first = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
      moduleName: 'isomer:first',
    });
    const second = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
      moduleName: 'isomer:second',
    });
    expect(
      diagnostics({
        '/virtual/first.d.ts': first,
        '/virtual/second.d.ts': second,
        '/virtual/use.tsx': `
      import { authorJsx, Note as FirstNote } from 'isomer:first';
      import { Note as SecondNote } from 'isomer:second';
      <FirstNote text="first" />;
      <SecondNote text="second" />;
    `,
      })
    ).toEqual([]);
  });

  it('lets authors bind non-identifier shim keys to local JSX names', () => {
    const definition = definePrimitive<PrimitiveNode>({
      type: 'code-block',
      catalog: entry('code-block'),
      examples: [],
      schema: z.strictObject({
        type: z.literal('code-block'),
        text: z.string(),
      }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': `const {'Code-block': CodeBlock} = components; <CodeBlock text="hi" />;`,
      })
    ).toEqual([]);
    expect(Object.hasOwn(buildJsxShim(defs), 'Code-block')).toBe(true);
  });

  it('checks catchall values without constraining differently typed named props', () => {
    const definition = definePrimitive<PrimitiveNode>({
      type: 'metrics',
      catalog: entry('metrics'),
      examples: [],
      schema: z
        .object({ type: z.literal('metrics'), label: z.string() })
        .catchall(z.number()),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Metrics label="load" key="metric" extra={1} />;',
      })
    ).toEqual([]);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Metrics label="load" extra="bad" />;',
      })
    ).toHaveLength(1);
    expect(
      definition.schema.safeParse({
        type: 'metrics',
        label: 'load',
        extra: 'bad',
      }).success
    ).toBe(false);
  });

  it('accepts optional trailing tuple entries and rejects their wrong value type', () => {
    const definition = definePrimitive<PrimitiveNode>({
      type: 'point',
      catalog: entry('point'),
      examples: [],
      schema: z.strictObject({
        type: z.literal('point'),
        coordinates: z.tuple([z.string(), z.number().optional()]),
      }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      definition.schema.safeParse({ type: 'point', coordinates: ['x'] }).success
    ).toBe(true);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx':
          '<Point coordinates={["x"]} />; <Point coordinates={["x",1]} />;',
      })
    ).toEqual([]);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Point coordinates={["x","bad"]} />;',
      })
    ).toHaveLength(1);
  });

  it('compiles a recursive dictionary and preserves its leaf type', () => {
    const tree: z.ZodType<string | { [key: string]: unknown }> = z.lazy(() =>
      z.union([z.string(), z.record(z.string(), tree)])
    );
    const definition = definePrimitive<PrimitiveNode>({
      type: 'tree',
      catalog: entry('tree'),
      examples: [],
      schema: z.strictObject({ type: z.literal('tree'), value: tree }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs, {
        extraDefs: [{ id: 'dictionary', schema: tree }],
      }),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Tree value={{branch:{leaf:"value"}}} />;',
      })
    ).toEqual([]);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Tree value={{branch:42}} />;',
      })
    ).toHaveLength(1);
  });

  it('rejects ordinary objects as children in an editor without React types', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Callout>{{bad:true}}</Callout>;',
      })
    ).toHaveLength(1);
    const shim = buildJsxShim(definitions);
    expect(() =>
      shim.toComposition(
        createElement(
          shim.Composition,
          {},
          createElement(
            defineAuthorComponent<Record<string, unknown>, 'callout'>(
              'callout'
            ),
            {},
            { bad: true } as never
          )
        )
      )
    ).toThrow();
  });

  it('replaces an authored field named children with one JSX children prop', () => {
    const definition = definePrimitive<PrimitiveNode>({
      type: 'nest',
      catalog: entry('nest'),
      examples: [],
      schema: z.strictObject({
        type: z.literal('nest'),
        children: fromChildren(
          'nestedItem',
          z.array(z.strictObject({ label: z.string() }))
        ),
      }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': '<Nest><NestedItem label="one" /></Nest>;',
      })
    ).toEqual([]);
    const shim = buildJsxShim(defs);
    expect(
      shim.toComposition(
        createElement(
          shim.Composition,
          {},
          createElement(
            defineAuthorComponent<Record<string, unknown>, 'nest'>('nest'),
            {},
            createElement(
              defineAuthorComponent<Record<string, unknown>, 'nestedItem'>(
                'nestedItem'
              ),
              { label: 'one' }
            )
          )
        )
      )
    ).toMatchObject({ body: [{ type: 'nest', children: [{ label: 'one' }] }] });
  });

  it('checks explicit input props for toItem and retains reference-based custom props', () => {
    const metadata = z.strictObject({ count: z.number() });
    const input = z.strictObject({
      title: z.string(),
      meta: metadata,
      backup: metadata.optional(),
    });
    const definition = definePrimitive<PrimitiveNode>({
      type: 'cardsInput',
      catalog: entry('cardsInput'),
      examples: [],
      schema: z.strictObject({
        type: z.literal('cardsInput'),
        items: fromChildren(
          'cardInput',
          z.array(z.strictObject({ label: z.string() })),
          {
            propsSchema: input,
            toItem(props: { title: string; meta: { count: number } }) {
              return { label: props.title };
            },
          }
        ),
      }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx':
          '<CardsInput><CardInput title="ok" meta={{count:1}} /></CardsInput>;',
      })
    ).toEqual([]);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx':
          '<CardsInput><CardInput title={42} meta={{count:1}} /></CardsInput>;',
      })
    ).toHaveLength(1);
  });

  it('preserves discriminated unions in custom input props', () => {
    const propsSchema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('text'), text: z.string() }),
      z.strictObject({ kind: z.literal('count'), count: z.number() }),
    ]);
    const definition = definePrimitive<PrimitiveNode>({
      type: 'choices',
      catalog: entry('choices'),
      examples: [],
      schema: z.strictObject({
        type: z.literal('choices'),
        items: fromChildren(
          'choice',
          z.array(z.strictObject({ label: z.string() })),
          {
            propsSchema,
            toItem(props) {
              return {
                label: props.kind === 'text' ? props.text : String(props.count),
              };
            },
          }
        ),
      }),
      renderers,
    });
    const defs = [definition];
    const declarations = buildAuthoringDeclarations(
      buildAuthoringJsonSchema(defs),
      defs,
      { jsx: true }
    );
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx':
          '<Choices><Choice kind="text" text="ok" /><Choice kind="count" count={1} /></Choices>;',
      })
    ).toEqual([]);
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx':
          '<Choices><Choice kind="count" count="bad" /></Choices>;',
      })
    ).toHaveLength(1);
  });

  it('leaves the host React JSX namespace unchanged', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });
    expect(
      diagnostics(
        {
          '/virtual/isomer.d.ts': declarations,
          '/virtual/use.tsx':
            'const hostElement: JSX.Element = React.createElement("div"); <Composition><Callout>Hello</Callout></Composition>;',
        },
        {
          types: ['react'],
          allowUmdGlobalAccess: true,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          jsxFactory: 'React.createElement',
        }
      )
    ).toEqual([]);
  });

  it('works with React types and the automatic JSX runtime', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });
    expect(
      diagnostics(
        {
          '/virtual/isomer.d.ts': declarations,
          '/virtual/use.tsx':
            '<Composition><Callout>Hello</Callout><Note text="ok" /></Composition>;',
        },
        {
          types: ['react'],
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: '@elastic/isomer-authoring',
          moduleResolution: ts.ModuleResolutionKind.Node10,
        }
      )
    ).toEqual([]);
  });

  it('declares an empty catalog as never', () => {
    const declarations = buildAuthoringDeclarations(
      { $defs: { bodyNode: { oneOf: [] } } },
      []
    );

    expect(declarations).toContain('type BodyNode = never;');
    expect(diagnostics({ '/virtual/isomer.d.ts': declarations })).toEqual([]);
  });
});

describe('authoringBodySchema', () => {
  it('is the body array with only the defs it reaches', () => {
    const body = authoringBodySchema(schema) as {
      $schema: string;
      type: string;
      items: { $ref: string };
      $defs: Record<string, unknown>;
    };

    expect(body.$schema).toBe(schema.$schema);
    expect(body.type).toBe('array');
    expect(body.items).toEqual({ $ref: '#/$defs/bodyNode' });
    expect(Object.keys(body.$defs)).toEqual(
      expect.arrayContaining(['badges', 'bodyNode', 'callout', 'note', 'stack'])
    );
    expect(schema.$defs).toHaveProperty('renderTheme');
    expect(body.$defs).not.toHaveProperty('renderTheme');
  });
});
