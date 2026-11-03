/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { pdfWorker } from './pdf_worker_file.cjs';

const execFileAsync = promisify(execFile);

/** Resolves `takumi-pdf` as Node does from the worker's directory, under `require` and under `import`. */
const RESOLVE = `
import { createRequire } from 'node:module';
const require = createRequire(process.argv[1]);
process.stdout.write(JSON.stringify([
  require.resolve('takumi-pdf'),
  import.meta.resolve('takumi-pdf'),
]));
`;

describe('the PDF worker', () => {
  it('loads takumi-pdf from its Node entry by the public specifier', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8')
    ) as { dependencies: Record<string, string> };
    const pin = manifest.dependencies['takumi-pdf'];
    const { file } = pdfWorker();
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--input-type=module', '--eval', RESOLVE, file],
      { cwd: dirname(file) }
    );

    expect(
      JSON.parse(stdout),
      `takumi-pdf ${pin} no longer maps its \`node\` export condition to bundlers/node.{cjs,mjs}, which the PDF worker loads; check its exports map before changing the pin`
    ).toEqual([
      expect.stringMatching(/[/\\]takumi-pdf[/\\]bundlers[/\\]node\.cjs$/),
      expect.stringMatching(/\/takumi-pdf\/bundlers\/node\.mjs$/),
    ]);
  });
});
