/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  apiReportEntries,
  orphanedApiReports,
  runApiExtractor,
  runtimeExports,
  syncApiReports,
} from './api_report.js';

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
    version: '1.0.0',
    type: 'module',
    exports: Object.fromEntries(
      Object.entries(exports).map(([key, types]) => [key, { types }])
    ),
  };
  writeFiles(dir, { 'package.json': JSON.stringify(manifest), ...files });
  return { dir, folder, manifest };
};

/** Writes the report for the package's root entry and returns it. */
const reportOf = (pkg) => {
  const [entry] = apiReportEntries([pkg]);
  const reportDir = join(root, 'api');
  const tempDir = join(root, 'temp');
  runApiExtractor(entry, { reportDir, tempDir, localBuild: true });
  return readFileSync(join(reportDir, `${entry.reportName}.api.md`), 'utf-8');
};

describe('apiReportEntries', () => {
  it('names one report per export subpath', () => {
    const pkg = fixturePackage(
      'subpaths',
      {
        'dist/index.d.ts': 'export declare const root: 1;\n',
        'dist/nested/extra.d.ts': 'export declare const extra: 2;\n',
      },
      { '.': './dist/index.d.ts', './nested/extra': './dist/nested/extra.d.ts' }
    );
    expect(apiReportEntries([pkg]).map(({ reportName }) => reportName)).toEqual(
      ['subpaths', 'subpaths.nested.extra']
    );
  });
});

describe('runApiExtractor', () => {
  it('lists unexported declarations a public signature names', () => {
    const report = reportOf(
      fixturePackage('forgotten', {
        'dist/index.d.ts': "export { type Public } from './types.js';\n",
        'dist/types.d.ts':
          'interface Inner {\n    value: string;\n}\nexport interface Public {\n    inner: Inner;\n}\nexport {};\n',
      })
    );
    expect(report).toContain('interface Inner {');
  });

  it('prints an aliased import by the declaration it binds to', () => {
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
    expect(report).toContain('function take(value: Narrow): void;');
  });

  it('lists what a namespace import exposes, and nothing it does not', () => {
    const report = reportOf(
      fixturePackage('namespace', {
        'dist/index.d.ts': "export { take, types } from './take.js';\n",
        'dist/types.d.ts':
          'export interface Input {\n    value: string;\n}\nexport declare const limit: number;\n',
        'dist/take.d.ts':
          "import * as Types from './types.js';\nexport declare function take(value: Types.Input): void;\nexport declare const types: typeof Types;\n",
      })
    );
    expect(report).toContain('interface Input {');
    expect(report).toContain('limit');
    expect(report).not.toContain(root);
  });
});

describe('runtimeExports', () => {
  it('lists the names the built module exports, leaving out type-only ones', async () => {
    const pkg = fixturePackage('runtime', {
      'dist/index.d.ts':
        "export { type Box } from './box.js';\nexport { Crate } from './box.js';\n",
      'dist/box.d.ts':
        'export declare class Box {\n}\nexport declare class Crate {\n}\n',
      'dist/index.js': "export { Crate } from './box.js';\n",
      'dist/box.js': 'export class Box {}\nexport class Crate {}\n',
    });
    pkg.manifest.exports['.'].import = './dist/index.js';
    const [entry] = apiReportEntries([pkg]);
    expect(await runtimeExports(entry)).toBe('Crate\n');
  });
});

describe('syncApiReports', () => {
  const checked = () => {
    const pkg = fixturePackage('checked', {
      'dist/index.d.ts': 'export declare function size(): number;\n',
      'dist/index.js': 'export function size() {\n    return 1;\n}\n',
    });
    pkg.manifest.exports['.'].import = './dist/index.js';
    return { pkg, reportDir: join(root, 'api') };
  };
  const snapshot = (reportDir) =>
    ['checked.api.md', 'checked.runtime.txt'].map((file) =>
      readFileSync(join(reportDir, file), 'utf-8')
    );

  it('passes a check right after writing', async () => {
    const { pkg, reportDir } = checked();
    const entries = apiReportEntries([pkg]);
    expect(await syncApiReports(entries, { reportDir, check: false })).toEqual(
      []
    );
    expect(await syncApiReports(entries, { reportDir, check: true })).toEqual(
      []
    );
  });

  it('reports a changed declaration without rewriting the report', async () => {
    const { pkg, reportDir } = checked();
    const entries = apiReportEntries([pkg]);
    await syncApiReports(entries, { reportDir, check: false });
    const before = snapshot(reportDir);
    writeFiles(pkg.dir, {
      'dist/index.d.ts': 'export declare function size(): string;\n',
    });
    expect(await syncApiReports(entries, { reportDir, check: true })).toEqual([
      'checked.api.md',
    ]);
    expect(snapshot(reportDir)).toEqual(before);
  });

  it('reports a changed runtime export list without rewriting it', async () => {
    const { pkg, reportDir } = checked();
    const entries = apiReportEntries([pkg]);
    await syncApiReports(entries, { reportDir, check: false });
    const before = snapshot(reportDir);
    // A new file, since an imported ES module stays cached by URL.
    writeFiles(pkg.dir, {
      'dist/changed.js':
        'export function size() {\n    return 1;\n}\nexport const extra = 2;\n',
    });
    const [entry] = apiReportEntries([pkg]);
    expect(
      await syncApiReports(
        [{ ...entry, module: join(pkg.dir, 'dist/changed.js') }],
        {
          reportDir,
          check: true,
        }
      )
    ).toEqual(['checked.runtime.txt']);
    expect(snapshot(reportDir)).toEqual(before);
  });

  it('reports missing and orphaned files', async () => {
    const { pkg, reportDir } = checked();
    writeFiles(reportDir, { 'gone.api.md': '' });
    expect(
      await syncApiReports(apiReportEntries([pkg]), { reportDir, check: true })
    ).toEqual(['checked.api.md', 'checked.runtime.txt', 'gone.api.md']);
  });
});

describe('orphanedApiReports', () => {
  it('lists committed reports no entry produces', () => {
    const reportDir = join(root, 'api');
    writeFiles(reportDir, {
      'kept.api.md': '',
      'kept.runtime.txt': '',
      'gone.api.md': '',
      'gone.runtime.txt': '',
      'notes.md': '',
    });
    expect(
      orphanedApiReports(reportDir, [{ reportName: 'kept', module: 'x.js' }])
    ).toEqual(['gone.api.md', 'gone.runtime.txt']);
  });
});
