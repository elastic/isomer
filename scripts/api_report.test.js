/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApiReports, staleApiReports } from './api_report.js';

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'isomer-api-report-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

const writeFiles = (dir, files) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
};

const fixturePackage = (
  folder,
  files,
  exports = { '.': './dist/index.d.ts' }
) => {
  const dir = join(root, folder);
  const manifest = {
    name: `@fixture/${folder}`,
    type: 'module',
    exports: Object.fromEntries(
      Object.entries(exports).map(([key, types]) => [key, { types }])
    ),
  };
  writeFiles(dir, {
    'package.json': JSON.stringify(manifest),
    ...files,
  });
  return { dir, folder, manifest };
};

const reportOf = (pkg) => createApiReports([pkg]).get(`${pkg.folder}.api.md`);

describe('createApiReports', () => {
  it('prints each export without comments, sorted, and notes a rename', () => {
    const report = reportOf(
      fixturePackage('basic', {
        'dist/index.d.ts':
          "export { zeta, alpha as renamed } from './values.js';\n",
        'dist/values.d.ts':
          '/** Doc. */\nexport declare const zeta: number;\nexport declare function alpha(input: string): string;\n',
      })
    );
    expect(report).toContain(
      '// exported as `renamed`\nfunction alpha(input: string): string;\n\nconst zeta: number;'
    );
    expect(report).not.toContain('Doc.');
  });

  it('names a default export by its public name', () => {
    const report = reportOf(
      fixturePackage('default', {
        'dist/index.d.ts': "export { default as Widget } from './widget.js';\n",
        'dist/widget.d.ts': 'export default function (): void;\n',
      })
    );
    expect(report).toContain('// exported as `Widget`');
  });

  it('lists the unexported value a member access starts from', () => {
    const report = reportOf(
      fixturePackage('member', {
        'dist/index.d.ts': "export { read } from './read.js';\n",
        'dist/read.d.ts':
          'declare const schema: {\n    optional(): string;\n};\nexport declare const read: ReturnType<typeof schema.optional>;\nexport {};\n',
      })
    );
    const [, referenced] = report.split('### Referenced, not exported');
    expect(referenced).toContain('const schema: {');
    expect(referenced).not.toContain('\noptional(): string;');
  });

  it('names a namespace import by its package-relative module, never its path', () => {
    const pkg = fixturePackage('namespace', {
      'dist/index.d.ts': "export { take } from './take.js';\n",
      'dist/types.d.ts': 'export interface Input {\n    value: string;\n}\n',
      'dist/take.d.ts':
        "import type * as Types from './types.js';\nexport declare function take(value: Types.Input): void;\n",
    });
    const report = reportOf(pkg);
    expect(report).toContain('Types = @fixture/namespace/dist/types.d.ts');
    expect(report).toContain('interface Input {');
    expect(report).not.toContain(root);
  });

  it('lists a signature name bound to a declaration of another name', () => {
    const report = reportOf(
      fixturePackage('aliased', {
        'dist/index.d.ts':
          "export { type Wide, type Narrow } from './types.js';\nexport { take } from './take.js';\n",
        'dist/types.d.ts':
          'export type Wide = string | number;\nexport type Narrow = string;\n',
        'dist/take.d.ts':
          "import type { Narrow as Input } from './types.js';\nexport declare function take(value: Input): void;\n",
      })
    );
    const [, renamed] = report.split('### Names bound under another name');
    expect(renamed).toContain('Input = Narrow');
  });

  it('marks a value exported as type only', () => {
    const report = reportOf(
      fixturePackage('type-only', {
        'dist/index.d.ts': "export { type Box } from './box.js';\n",
        'dist/box.d.ts': 'export declare class Box {\n    size: number;\n}\n',
      })
    );
    expect(report).toContain('// type-only export\nclass Box {');
  });

  it('prints a dependency re-export with the specifier the declaration writes', () => {
    const report = reportOf(
      fixturePackage('external', {
        'dist/index.d.ts': "export type { Thing as Other } from 'some-lib';\n",
      })
    );
    expect(report).toContain("export { Thing as Other } from 'some-lib';");
  });

  it('lists unexported declarations a signature names, through keys and transitively', () => {
    const report = reportOf(
      fixturePackage('referenced', {
        'dist/index.d.ts': "export { type Public } from './types.js';\n",
        'dist/types.d.ts': [
          'declare const brand: unique symbol;',
          'interface Inner {\n    value: string;\n}',
          'interface Middle {\n    inner: Inner;\n}',
          'export interface Public {\n    [brand]: true;\n    middle: Middle;\n}',
          '',
        ].join('\n'),
      })
    );
    const [, referenced] = report.split('### Referenced, not exported');
    expect(referenced).toContain('const brand: unique symbol;');
    expect(referenced).toContain('interface Middle {');
    expect(referenced).toContain('interface Inner {');
  });

  it('gives each export subpath its own section', () => {
    const report = reportOf(
      fixturePackage(
        'subpaths',
        {
          'dist/index.d.ts': 'export declare const root: 1;\n',
          'dist/extra.d.ts': 'export declare const extra: 2;\n',
        },
        { '.': './dist/index.d.ts', './extra': './dist/extra.d.ts' }
      )
    );
    expect(report).toContain('## `@fixture/subpaths`\n\n```ts\nconst root: 1;');
    expect(report).toContain(
      '## `@fixture/subpaths/extra`\n\n```ts\nconst extra: 2;'
    );
  });
});

describe('staleApiReports', () => {
  it('reports changed, missing, and orphaned reports', () => {
    const reportDir = join(root, 'api');
    writeFiles(reportDir, {
      'current.api.md': 'same',
      'changed.api.md': 'before',
      'orphan.api.md': 'no package',
    });
    const reports = new Map([
      ['current.api.md', 'same'],
      ['changed.api.md', 'after'],
      ['missing.api.md', 'new'],
    ]);
    expect(staleApiReports(reportDir, reports)).toEqual([
      'changed.api.md',
      'missing.api.md',
      'orphan.api.md',
    ]);
  });
});
