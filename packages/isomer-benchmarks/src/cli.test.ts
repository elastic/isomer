/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

  it('refuses --write, since a baseline needs every row', () => {
    const file = join(dir, 'baseline.json');
    const { status, stderr } = bench('charts', '--check', '--write', file);
    expect(status).toBe(1);
    expect(stderr).toContain('it takes no --write');
    expect(existsSync(file)).toBe(false);
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

  it('refuses a measure two configs both bound', () => {
    const body = (peakRssMb: number) => ({
      name: 't',
      entries: ['a'],
      charts: {},
      bounds: { charts: { 't:resolve': { peakRssMb } } },
    });
    const { status, stderr } = bench(
      'charts',
      '--check',
      '--config',
      config('first', body(1)),
      '--config',
      config('second', body(2))
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain('t:resolve peakRssMb: bounded twice');
  });
});

describe('bench --check on a measured scenario', () => {
  // Inside this package, so the charts pack and the runtime resolve from the config.
  mkdirSync(
    join(dirname(fileURLToPath(import.meta.url)), '../node_modules/.cache'),
    { recursive: true }
  );
  const dir = mkdtempSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../node_modules/.cache/check-'
    )
  );
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const check = (peakRssMb: number) => {
    const file = join(dir, `bound-${peakRssMb}.cjs`);
    writeFileSync(
      file,
      `module.exports = ${JSON.stringify({
        name: 't',
        entries: ['@elastic/isomer-primitives-charts'],
        charts: {},
        bounds: { charts: { 't:resolve': { peakRssMb } } },
      })};`
    );
    return bench('charts', '--check', '--runs', '1', '--config', file);
  };

  it('passes a median under its bound and fails one over it', () => {
    const under = check(100_000);
    expect(under.status).toBe(0);
    expect(under.stdout).toContain('✓ t:resolve peakRssMb');
    const over = check(1);
    expect(over.status).toBe(1);
    expect(over.stdout).toContain('✗ t:resolve peakRssMb');
    expect(over.stderr).toContain('1 of 1 over their bound.');
  });
});

describe('bench --check with a bound of 0', () => {
  const cache = join(
    dirname(fileURLToPath(import.meta.url)),
    '../node_modules/.cache'
  );
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, 'zero-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('passes a measured 0 at its bound', () => {
    const file = join(dir, 'zero.cjs');
    writeFileSync(
      file,
      `module.exports = ${JSON.stringify({
        name: 'zero',
        entries: ['@elastic/isomer-primitives-charts/scene'],
        bounds: { load: { node: { modules: 0 } } },
      })};`
    );
    const { status, stdout } = bench(
      'load',
      '--check',
      '--runs',
      '1',
      '--config',
      file
    );
    expect(status).toBe(0);
    expect(stdout).toContain('✓ node modules: 0.0, bound 0');
  });
});

describe('bench size --check', () => {
  const cache = join(
    dirname(fileURLToPath(import.meta.url)),
    '../node_modules/.cache'
  );
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, 'size-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const entry = '@elastic/isomer-primitives-charts/scene';
  const check = (name: string, measures: object) => {
    const file = join(dir, `${name}.cjs`);
    writeFileSync(
      file,
      `module.exports = ${JSON.stringify({
        name,
        entries: [entry],
        bounds: { size: { [entry]: measures } },
      })};`
    );
    return bench('size', '--check', '--config', file);
  };

  it('refuses an entry with a size it has no bound for', () => {
    const { status, stderr } = check('gap', { nodeKb: 100_000 });
    expect(status).toBe(1);
    expect(stderr).toContain(`size: no bound for ${entry} browserKb`);
  });

  it('passes an entry under both bounds and fails one over', () => {
    expect(check('under', { nodeKb: 100_000, browserKb: 100_000 }).status).toBe(
      0
    );
    const over = check('over', { nodeKb: 100_000, browserKb: 0 });
    expect(over.status).toBe(1);
    expect(over.stdout).toContain(`✗ ${entry} browserKb`);
  });
});

describe('bench charts with an engine', () => {
  const cache = join(
    dirname(fileURLToPath(import.meta.url)),
    '../node_modules/.cache'
  );
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, 'engine-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const draw = (name: string, adapter: string, row = 'one') => {
    writeFileSync(join(dir, `${name}.engine.cjs`), adapter);
    const file = join(dir, `${name}.cjs`);
    writeFileSync(
      file,
      `module.exports = ${JSON.stringify({
        name,
        entries: ['@elastic/isomer-primitives-charts'],
        charts: { engine: `./${name}.engine.cjs` },
      })};`
    );
    return bench(
      'charts',
      '--runs',
      '1',
      '--config',
      file,
      '--scenarios',
      `${name}:${row}`
    );
  };

  it('fails a row the engine draws nothing for', () => {
    const { status, stderr } = draw(
      'blank',
      `module.exports = { createRenderers: () => [{
        id: 'blank', environments: ['node'], supports: () => true, render: () => null,
      }] };`
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain(
      "the engine drew nothing for 1 of this composition's charts, such as chart"
    );
  });

  it('draws with a frozen engine whose methods read private fields', () => {
    const { status, stderr } = draw(
      'private',
      `class Engine {
        #kinds = new Set(['xy']);
        id = 'private';
        environments = ['node'];
        supports(kind) { return this.#kinds.has(kind); }
        render() { return this.#kinds.size > 0 ? 'drawn' : null; }
      }
      module.exports = { createRenderers: () => [Object.freeze(new Engine())] };`
    );
    expect(stderr).toBe('');
    expect(status).toBe(0);
  });

  it('fails a grid the engine draws only some panels of', () => {
    const { status, stderr } = draw(
      'partial',
      `module.exports = { createRenderers: () => [{
        id: 'partial', environments: ['node'], supports: () => true,
        render: (scene, { nodeId }) => (Number(nodeId.slice('panel-'.length)) % 2 === 0 ? 'drawn' : null),
      }] };`,
      'budget-grid'
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain(
      "the engine drew nothing for 20 of this composition's charts, such as panel-1"
    );
  }, 60_000);
});
