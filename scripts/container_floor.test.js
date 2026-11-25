/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const { classify, findFloor, searchOptions } = createRequire(import.meta.url)(
  './container_floor.cjs'
);

/** Passes at or above `floor`, failing below it with `kind`. */
const above =
  (floor, kind = 'oom') =>
  async (limit) =>
    limit >= floor ? 'pass' : kind;

const settings = { min: 64, max: 2048, step: 8, tries: 1 };

describe('findFloor', () => {
  it('bisects to within a step of the floor, naming what bounded it', async () => {
    const found = await findFloor({ ...settings, attempt: above(300, 'heap') });
    expect(found.result).toBe('floor');
    expect(found.passesAt).toBeGreaterThanOrEqual(300);
    expect(found.failsAt).toBeLessThan(300);
    expect(found.passesAt - found.failsAt).toBeLessThanOrEqual(8);
    expect(found.kind).toBe('heap');
  });

  it('holds a limit to every try, so a flaky pass does not lower the floor', async () => {
    const seen = new Map();
    // Below 400, the first try passes and the second fails.
    const flaky = async (limit) => {
      const count = (seen.get(limit) ?? 0) + 1;
      seen.set(limit, count);
      return limit >= 400 || count % 2 === 1 ? 'pass' : 'oom';
    };
    const found = await findFloor({ ...settings, tries: 2, attempt: flaky });
    expect(found.passesAt).toBeGreaterThanOrEqual(400);
  });

  it('says when the command fails at the maximum', async () => {
    expect(
      await findFloor({ ...settings, attempt: above(4096, 'heap') })
    ).toEqual({ result: 'fails at the maximum', failsAt: 2048, kind: 'heap' });
  });

  it('says when the command passes at the minimum', async () => {
    expect(await findFloor({ ...settings, attempt: above(0) })).toEqual({
      result: 'passes at the minimum',
      passesAt: 64,
    });
  });

  it('stops on any failure that is not about memory', async () => {
    await expect(
      findFloor({ ...settings, attempt: async () => 'exit 1:\nboom' })
    ).rejects.toThrow('2048 MB: exit 1:\nboom');
  });
});

describe('classify', () => {
  const exited = {
    status: 'exited',
    oomKilled: false,
    exitCode: 0,
    stderr: '',
  };

  it('passes a container that exited 0', () => {
    expect(classify(exited)).toBe('pass');
  });

  it('passes a command that exited 0 though the kernel killed something else', () => {
    expect(classify({ ...exited, oomKilled: true })).toBe('pass');
  });

  it('calls a kill the kernel reported an OOM, whatever stderr says', () => {
    expect(
      classify({
        ...exited,
        oomKilled: true,
        exitCode: 137,
        stderr: 'JavaScript heap out of memory',
      })
    ).toBe('oom');
  });

  it("calls an abort with V8's diagnostic a heap failure", () => {
    expect(
      classify({
        ...exited,
        exitCode: 134,
        stderr: 'FATAL ERROR: Reached heap limit',
      })
    ).toBe('heap');
  });

  it('refuses a kill the kernel did not report, and a heap message without an abort', () => {
    expect(classify({ ...exited, exitCode: 137 })).toMatch(/^exit 137/);
    expect(
      classify({
        ...exited,
        exitCode: 1,
        stderr: 'JavaScript heap out of memory',
      })
    ).toMatch(/^exit 1/);
  });

  it('refuses a container that has not exited', () => {
    expect(classify({ ...exited, status: 'running' })).toBe(
      'the container is running, not exited'
    );
  });
});

describe('searchOptions', () => {
  it.each([
    [['--tries', '0'], '--tries 0: a whole number of at least 1'],
    [['--step', 'x'], '--step x: a whole number of at least 1'],
    [['--min', '512', '--max', '256'], '--min 512 must be below --max 256'],
  ])('refuses %j', (options, message) => {
    expect(() => searchOptions(options)).toThrow(message);
  });
});

describe('the runner, against a stub Docker', () => {
  const RUNNER = fileURLToPath(
    new URL('./container_floor.cjs', import.meta.url)
  );
  const dir = mkdtempSync(join(tmpdir(), 'isomer-floor-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, 'calls.log');
  const stub = join(dir, 'docker.cjs');
  // Answers each Docker call the runner makes; MODE picks what `start` does.
  writeFileSync(
    stub,
    `const { appendFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.STUB_LOG, args.join(' ') + '\\n');
const mode = process.env.STUB_MODE;
const format = args[args.indexOf('--format') + 1] ?? '';
if (args[0] === 'info') {
  console.log(format.includes('MemoryLimit') ? 'true true' : 'linux arm64');
} else if (args[0] === 'image') {
  console.log('sha256:0123456789abcdef0123');
} else if (args[0] === 'run') {
  console.log('v24.0.0');
} else if (args[0] === 'create') {
  setTimeout(() => console.log('container-a'), mode === 'slow-create' ? 3000 : 0);
} else if (args[0] === 'ps') {
  console.log('container-a');
} else if (args[0] === 'inspect' && format.includes('HostConfig')) {
  console.log('2147483648 2147483648');
} else if (args[0] === 'start') {
  if (mode === 'hang') {
    setTimeout(() => {}, 60000);
  } else {
    process.exit(1);
  }
} else if (args[0] === 'inspect') {
  console.log(mode === 'lost-running' ? 'running false 0' : 'exited false 0');
}
`
  );
  const env = (mode) => ({
    ...process.env,
    ISOMER_FLOOR_DOCKER: stub,
    STUB_LOG: log,
    STUB_MODE: mode,
  });
  const command = [RUNNER, '--no-build', '--profile', 'default', '--', 'node'];

  it.each([
    ['lost-running', 'the container is running, not exited'],
    ['lost-exited', 'docker start exited 1 for a container that exited 0'],
  ])('never counts a run the client lost as a pass (%s)', (mode, message) => {
    writeFileSync(log, '');
    const { status, stderr } = spawnSync(process.execPath, command, {
      env: env(mode),
      encoding: 'utf8',
    });
    expect(status).toBe(1);
    expect(stderr).toContain(message);
    expect(readFileSync(log, 'utf8')).toContain('rm -f container-a');
  });

  // Windows delivers no SIGINT a script can handle.
  it.skipIf(process.platform === 'win32').each([
    ['an attached run', 'hang', 'start --attach'],
    ['a create still in flight', 'slow-create', 'create '],
  ])(
    'removes only its own container when interrupted during %s',
    async (_, mode, during) => {
      writeFileSync(log, '');
      const child = spawn(process.execPath, command, { env: env(mode) });
      for (let wait = 0; wait < 100; wait += 1) {
        if (readFileSync(log, 'utf8').includes(during)) {
          break;
        }
        await new Promise((done) => setTimeout(done, 100));
      }
      child.kill('SIGINT');
      const code = await new Promise((done) => child.on('close', done));
      expect(code).toBe(130);
      const removals = readFileSync(log, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('rm '));
      expect(removals).toEqual(['rm -f container-a']);
    },
    30_000
  );
});
