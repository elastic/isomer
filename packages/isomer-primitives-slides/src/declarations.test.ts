/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { slidesPack } from './index';

const { declarations } = createIsomerRuntime({
  packs: [slidesPack],
  authoring: { jsx: true },
}).getAuthoringContext();

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
  return ts
    .getPreEmitDiagnostics(ts.createProgram(Object.keys(files), options, host))
    .map(({ messageText }) =>
      ts.flattenDiagnosticMessageText(messageText, ' ')
    );
};

describe('the slides pack authoring declarations', () => {
  it('declare every primitive as a node type, with its catalog text as JSDoc', () => {
    expect(declarations).toContain('interface SlideStatsNode {');
    expect(declarations).toContain('Use when:');
    expect(declarations).toContain('type BodyNode =\n  | SlideAgendaNode');
  });

  it('compile on their own', () => {
    expect(diagnostics({ '/virtual/isomer.d.ts': declarations })).toEqual([]);
  });

  it('type-check slide JSX, branded children included', () => {
    const use = `
      const deck = (
        <Composition title="Ownership">
          <SlideFrame brand="Isomer" tone="page">
            <SlideHeading title="Who owns what" />
            <SlideTerritoryGroup>
              <SlideTerritory title="Us" tone="primary">
                We own the contract.
              </SlideTerritory>
            </SlideTerritoryGroup>
          </SlideFrame>
        </Composition>
      );
      const node: BodyNode = { type: 'slideStat', body: 'Faster.' };
    `;

    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': use,
      })
    ).toEqual([]);
  });

  it('reject a node no slide primitive declares', () => {
    expect(
      diagnostics({
        '/virtual/isomer.d.ts': declarations,
        '/virtual/use.tsx': "const node: BodyNode = { type: 'missing' };",
      })
    ).toHaveLength(1);
  });
});
