/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const { checkBounds, limit } = createRequire(import.meta.url)(
  './bench_charts.cjs'
);

const BOUNDS = { one: { peakRssMb: 300, renderRssMb: 40 } };
const run = (peakRssMb, renderRssMb) => ({
  scenario: 'one',
  peakRssMb,
  renderRssMb,
});
const failing = (results) =>
  checkBounds(results, ['one'], BOUNDS)
    .filter(({ ok }) => !ok)
    .map(({ key }) => key);

describe('checkBounds', () => {
  it('passes runs whose medians are within their bounds', () => {
    expect(failing([run(250, 30), run(260, 35), run(270, 38)])).toEqual([]);
  });

  it('passes a median exactly at its bound', () => {
    expect(failing([run(300, 40), run(300, 40), run(300, 40)])).toEqual([]);
  });

  it('fails when the peak median exceeds its bound', () => {
    expect(failing([run(310, 30), run(320, 30), run(250, 30)])).toEqual([
      'peakRssMb',
    ]);
  });

  it('fails when the render median exceeds its bound', () => {
    expect(failing([run(250, 45), run(250, 50), run(250, 30)])).toEqual([
      'renderRssMb',
    ]);
  });

  it('passes when only one of three runs is an outlier', () => {
    expect(failing([run(250, 30), run(900, 600), run(260, 32)])).toEqual([]);
  });

  it('reports the median and bound', () => {
    const [peak] = checkBounds([run(250, 30)], ['one'], BOUNDS);
    expect(peak).toMatchObject({ median: 250, bound: 300, ok: true });
    expect(peak.line).toBe('one peakRssMb: median 250 MB, bound 300 MB');
  });

  it('leaves an unbounded scenario alone', () => {
    expect(checkBounds([], ['baseline'], BOUNDS)).toEqual([]);
  });

  it('throws on a bounded scenario with no runs', () => {
    expect(() => checkBounds([], ['one'], BOUNDS)).toThrow(/no runs/);
  });
});

const ticks = async (count) => {
  for (let tick = 0; tick < count; tick += 1) {
    await Promise.resolve();
  }
};

describe('limit', () => {
  const tracked = () => {
    let running = 0;
    let most = 0;
    const releases = [];
    const render = () => {
      running += 1;
      most = Math.max(most, running);
      return new Promise((resolve) => {
        releases.push(() => {
          running -= 1;
          resolve();
        });
      });
    };
    return { render, releases, most: () => most };
  };

  it.each(Array.from({ length: 8 }, (_, delay) => delay))(
    'never runs more than inFlight when a call lands %i ticks after a release',
    async (delay) => {
      const { render, releases, most } = tracked();
      const limited = limit(1, 10);
      const all = [limited(render), limited(render)];
      await ticks(1);
      releases.shift()();
      await ticks(delay);
      all.push(limited(render));
      let settled = 0;
      all.forEach((call) => call.then(() => (settled += 1)));
      for (let step = 0; step < 50 && settled < all.length; step += 1) {
        await ticks(10);
        releases.shift()?.();
      }
      await Promise.all(all);
      expect(most()).toBe(1);
    }
  );

  it('runs queued renders in the order they were requested', async () => {
    const order = [];
    const limited = limit(2, 10);
    await Promise.all(
      [0, 1, 2, 3, 4].map((index) =>
        limited(async () => {
          order.push(index);
          await ticks(1);
        })
      )
    );
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  it('refuses past the queue length', async () => {
    const { render, releases } = tracked();
    const limited = limit(1, 1);
    const first = limited(render);
    const second = limited(render);
    await expect(limited(render)).rejects.toThrow('busy');
    releases.shift()();
    await ticks(10);
    releases.shift()();
    await Promise.all([first, second]);
  });

  it('frees the slot when a render throws', async () => {
    const limited = limit(1, 1);
    await expect(
      limited(() => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom');
    await expect(limited(async () => 'next')).resolves.toBe('next');
  });
});

describe('the harness', () => {
  it('refuses an engine scenario without an engine', () => {
    const run = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./bench_charts.cjs', import.meta.url)),
        '--scenarios',
        'engine',
      ],
      { encoding: 'utf8' }
    );
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain('engine: needs --engine');
  });
});
