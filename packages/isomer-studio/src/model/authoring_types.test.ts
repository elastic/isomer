/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import ts from 'typescript';

import { componentsPack } from '../fixtures/components_pack';

import { AUTHORING_MODULE, bodyJsonSchema } from './authoring_types';
import { describeRuntime } from './describe_runtime';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});
const {
  authoring: { declarations },
} = describeRuntime(runtime);

/** Diagnostics for in-memory `files`, compiled with the editor's JSX settings. */
const typeErrors = (files: Readonly<Record<string, string>>): string[] => {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: AUTHORING_MODULE,
    strict: true,
    noEmit: true,
    lib: ['lib.es2020.d.ts'],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const program = ts.createProgram(Object.keys(files), options, {
    ...host,
    getSourceFile: (name, version) => {
      const source = files[name];
      return source === undefined
        ? host.getSourceFile(name, version)
        : ts.createSourceFile(name, source, version);
    },
    fileExists: (name) => name in files || host.fileExists(name),
    readFile: (name) => files[name] ?? host.readFile(name),
  });

  return ts
    .getPreEmitDiagnostics(program)
    .map(({ file, start = 0, messageText }) => {
      const message = ts.flattenDiagnosticMessageText(messageText, '\n');
      return file
        ? `${file.fileName}:${file.getLineAndCharacterOfPosition(start).line + 1} ${message}`
        : message;
    });
};

describe('authoringDeclarations', () => {
  it('declares the SDK authoring module with its JSX runtime', () => {
    expect(declarations).toContain(
      'declare module "@elastic/isomer-authoring" {'
    );
    expect(declarations).toContain(
      'declare module "@elastic/isomer-authoring/jsx-runtime" {'
    );
    expect(declarations).toContain(
      'const Callout: (props: CalloutProps) => null;'
    );
  });

  it('declares every shim component, child components included, as a global', () => {
    [
      'Composition',
      'Callout',
      'Divider',
      'Health',
      'StatGroup',
      'Stat',
    ].forEach((name) =>
      expect(declarations).toContain(
        `declare const ${name}: typeof import("@elastic/isomer-authoring").${name};`
      )
    );
  });

  it('type-checks unimported JSX against the authoring module', () => {
    const source = `<Composition>
  <Callout tone="warning">Disk full.</Callout>
  <StatGroup>
    <Stat value={{ raw: 5 }}>Hosts</Stat>
  </StatGroup>
  <Divider spacing="huge" />
</Composition>`;

    expect(
      typeErrors({ '/runtime.d.ts': declarations, '/composition.tsx': source })
    ).toEqual([
      expect.stringMatching(
        /^\/composition\.tsx:6 Type '"huge"' is not assignable/
      ),
    ]);
  });
});

describe('bodyJsonSchema', () => {
  it('accepts one body node or a non-empty array of them', () => {
    const bodySchema = bodyJsonSchema(runtime.getAuthoringContext());
    expect(Object.keys(bodySchema.$defs ?? {})).toEqual(
      expect.arrayContaining(['bodyNode', 'tone'])
    );
    expect(bodySchema.oneOf).toEqual([
      { $ref: '#/$defs/bodyNode' },
      { type: 'array', minItems: 1, items: { $ref: '#/$defs/bodyNode' } },
    ]);
  });

  it('is empty for a body schema without items', () => {
    expect(bodyJsonSchema({ bodySchema: {} })).toEqual({});
  });
});
