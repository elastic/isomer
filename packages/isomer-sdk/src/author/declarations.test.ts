/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const diagnostics = (files: Record<string, string>): string[] => {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ES2022,
    types: [],
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
    expect(declarations).toContain('/** What to say. */\n  text: string;');
    expect(declarations).toContain('tone?: "info" | "warn";');
  });

  it('unions the node types as BodyNode and points containers at it', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions);

    expect(declarations).toContain(
      'type BodyNode =\n  | NoteNode\n  | BadgesNode\n  | CalloutNode\n  | StackNode;'
    );
    expect(declarations).toContain('items: BodyNode[];');
  });

  it('declares nothing JSX-shaped unless asked', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions);

    expect(declarations).not.toContain('declare const');
    expect(declarations).not.toContain('JSX');
  });

  it('is a script, not a module, so an editor can load it as one lib', () => {
    for (const jsx of [false, true]) {
      const declarations = buildAuthoringDeclarations(schema, definitions, {
        jsx,
      });

      expect(declarations).not.toMatch(/^(import|export) /m);
    }
  });

  it('declares each primitive and branded child as a component with typed props', () => {
    const declarations = buildAuthoringDeclarations(schema, definitions, {
      jsx: true,
    });

    expect(declarations).toContain(
      'declare const Composition: (props: CompositionProps) => null;'
    );
    expect(declarations).toContain(
      'declare const Note: (props: NoteProps) => null;'
    );
    expect(declarations).toContain(
      'declare const Badge: (props: BadgeProps) => null;'
    );
    expect(declarations).toMatch(/interface BadgesProps \{\n {2}items\?: \{/);
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

    expect(declarations).toContain('interface Record2 {');
    expect(declarations).toContain('interface ImageNode {');
    expect(declarations).not.toContain('declare const Image:');
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
      })
    ).toEqual([]);
  });

  it('skips a component whose name is not an identifier', () => {
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
    expect(declarations).not.toContain('declare const Code-block');
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
      /interface RowProps \{\n {2}type: "a" \| "b";/
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

    expect(declarations).toContain('declare const Card:');
    expect(declarations).not.toContain('declare const Tag:');
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
