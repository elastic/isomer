/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const RUN = fileURLToPath(new URL('../cli/run.cjs', import.meta.url));
const bench = (...args: string[]) =>
  spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8' });

describe('bench --check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'isomer-bench-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const config = (name: string, body: object) => {
    const file = join(dir, `${name}.cjs`);
    writeFileSync(file, `module.exports = ${JSON.stringify(body)};`);
    return file;
  };

  it('refuses --scenarios, since it runs what is bounded', () => {
    const { status, stderr } = bench('charts', '--check', '--scenarios', 'a');
    expect(status).not.toBe(0);
    expect(stderr).toContain('it takes no --scenarios');
  });

  it('refuses a suite nothing bounds', () => {
    const file = config('unbounded', { name: 'a', entries: ['a'], charts: {} });
    const { status, stderr } = bench('charts', '--check', '--config', file);
    expect(status).not.toBe(0);
    expect(stderr).toContain('charts: nothing to check');
  });

  it('refuses a bound on a scenario the suite has no row for', () => {
    const file = config('misnamed', {
      name: 'a',
      entries: ['a'],
      charts: {},
      bounds: { charts: { 'a:nope': { peakRssMb: 1 } } },
    });
    const { status, stderr } = bench('charts', '--check', '--config', file);
    expect(status).not.toBe(0);
    expect(stderr).toContain('charts: unknown scenario a:nope');
  });
});
