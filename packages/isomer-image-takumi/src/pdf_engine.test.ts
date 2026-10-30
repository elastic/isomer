/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { fromHtml } from '@takumi-rs/helpers/html';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPdfEngine, PDF_ENGINE_CLOSED } from './pdf_engine';

const execFileAsync = promisify(execFile);
const { node: NODE } = fromHtml('<div></div>');
const OPTIONS = { viewport: { width: 10 } };
const CLOSED = { name: 'IsomerError', code: PDF_ENGINE_CLOSED };

/** Stand-in workers speaking the engine's protocol, one behavior each. */
const WORKERS = {
  /** Answers `measure`, and exits on `render`. */
  crashOnRender: `
import { parentPort } from 'node:worker_threads';
parentPort.on('message', ({ id, op }) => {
  if (op === 'render') process.exit(3);
  parentPort.postMessage({ id, result: { width: 1, height: 2 } });
});
parentPort.postMessage({ ready: true });
`,
  /** Ready, and never answers. */
  silent: `
import { parentPort } from 'node:worker_threads';
parentPort.on('message', () => {});
parentPort.postMessage({ ready: true });
`,
  /** Leaves a marker file named in its first line, so a test sees it started. */
  marker: (path: string) => `
import { writeFileSync } from 'node:fs';
import { parentPort } from 'node:worker_threads';
writeFileSync(${JSON.stringify(path)}, '');
parentPort.postMessage({ ready: true });
`,
};

describe('createPdfEngine', () => {
  let dir = '';
  const workerFile = async (name: string, source: string) => {
    const file = join(dir, `${name}.mjs`);
    await writeFile(file, source);
    return { file };
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'isomer-pdf-engine-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('rejects pending calls on close with a coded IsomerError, and every call after', async () => {
    const engine = createPdfEngine(
      [],
      await workerFile('silent', WORKERS.silent)
    );
    const pending = engine.measure(NODE, OPTIONS);
    const rejected = expect(pending).rejects.toMatchObject(CLOSED);

    await engine.close();
    await rejected;
    await expect(engine.measure(NODE, OPTIONS)).rejects.toMatchObject(CLOSED);
    await expect(engine.render(NODE, OPTIONS)).rejects.toMatchObject(CLOSED);
    await expect(engine.close()).resolves.toBeUndefined();
  });

  it('rejects the calls on a worker that exits, and starts another for the next call', async () => {
    const engine = createPdfEngine(
      [],
      await workerFile('crash', WORKERS.crashOnRender)
    );

    await expect(engine.render(NODE, OPTIONS)).rejects.toThrow(
      /exited with code 3/
    );
    await expect(engine.measure(NODE, OPTIONS)).resolves.toEqual({
      width: 1,
      height: 2,
    });
    await engine.close();
  });

  const engineModule = fileURLToPath(
    new URL('./pdf_engine.ts', import.meta.url)
  );
  const runHost = (flags: string[], host: string) =>
    execFileAsync(process.execPath, [...flags, '--eval', host], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      timeout: 20_000,
    });

  it('starts its worker in a host run with --input-type and a V8 flag', async () => {
    // CommonJS through tsx's API, so the host passes no `--import` for the worker to inherit.
    const host = `const { createPdfEngine } = require('tsx/cjs/api').require(${JSON.stringify(engineModule)}, ${JSON.stringify(engineModule)});
const engine = createPdfEngine([]);
engine.measure(${JSON.stringify(NODE)}, ${JSON.stringify(OPTIONS)}).then(({ width }) => {
  process.stdout.write(typeof width);
  return engine.close();
});`;
    const { stdout } = await runHost(
      ['--max-old-space-size=512', '--input-type=commonjs'],
      host
    );
    expect(stdout).toBe('number');
  }, 30_000);

  it('starts its worker in an ESM host run with a preload, --input-type and a V8 flag', async () => {
    // The package has no `"type"`, so Node loads its source as CommonJS: the exports are the default import.
    const host = `import engineModule from ${JSON.stringify(engineModule)};
const engine = engineModule.createPdfEngine([]);
const { width } = await engine.measure(${JSON.stringify(NODE)}, ${JSON.stringify(OPTIONS)});
process.stdout.write(typeof width);
await engine.close();`;
    const { stdout } = await runHost(
      ['--max-old-space-size=512', '--import', 'tsx', '--input-type=module'],
      host
    );
    expect(stdout).toBe('number');
  }, 30_000);

  it('starts no worker when its fonts load after close', async () => {
    const marker = join(dir, 'started');
    let load = (_bytes: Uint8Array) => {};
    const engine = createPdfEngine(
      [
        {
          name: 'Late',
          data: () =>
            new Promise<Uint8Array>((resolve) => {
              load = resolve;
            }),
        },
      ],
      await workerFile('marker', WORKERS.marker(marker))
    );
    const rejected = expect(
      engine.measure(NODE, OPTIONS)
    ).rejects.toMatchObject(CLOSED);

    await engine.close();
    await rejected;
    load(new Uint8Array());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(existsSync(marker)).toBe(false);
  });
});
