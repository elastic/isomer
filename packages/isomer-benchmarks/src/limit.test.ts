/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { limit } from './limit';

const ticks = async (count: number) => {
  for (let tick = 0; tick < count; tick += 1) {
    await Promise.resolve();
  }
};

describe('limit', () => {
  const tracked = () => {
    let running = 0;
    let most = 0;
    const releases: Array<() => void> = [];
    const render = () => {
      running += 1;
      most = Math.max(most, running);
      return new Promise<void>((resolve) => {
        releases.push(() => {
          running -= 1;
          resolve();
        });
      });
    };
    const release = () => {
      const next = releases.shift();
      if (next === undefined) {
        throw new Error('nothing to release');
      }
      next();
    };
    return { render, release, releases, most: () => most };
  };

  it.each(Array.from({ length: 8 }, (_, delay) => delay))(
    'never runs more than inFlight when a call lands %i ticks after a release',
    async (delay) => {
      const { render, release, releases, most } = tracked();
      const limited = limit(1, 10);
      const all = [limited(render), limited(render)];
      await ticks(1);
      release();
      await ticks(delay);
      all.push(limited(render));
      let settled = 0;
      for (const call of all) {
        void call.then(() => {
          settled += 1;
        });
      }
      for (let step = 0; step < 50 && settled < all.length; step += 1) {
        await ticks(10);
        releases.shift()?.();
      }
      await Promise.all(all);
      expect(most()).toBe(1);
    }
  );

  it('runs queued renders in the order they were requested', async () => {
    const order: number[] = [];
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
    const { render, release } = tracked();
    const limited = limit(1, 1);
    const first = limited(render);
    const second = limited(render);
    await expect(limited(render)).rejects.toThrow('busy');
    release();
    await ticks(10);
    release();
    await Promise.all([first, second]);
  });

  it('frees the slot when a render throws', async () => {
    const limited = limit(1, 1);
    await expect(
      limited(() => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom');
    await expect(limited(() => Promise.resolve('next'))).resolves.toBe('next');
  });
});
