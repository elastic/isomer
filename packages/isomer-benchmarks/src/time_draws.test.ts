/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { timeDraws } from './time_draws';

const ticks = async (count: number) => {
  for (let tick = 0; tick < count; tick += 1) {
    await Promise.resolve();
  }
};

describe('timeDraws', () => {
  // Each draw finishes when released; the clock moves only when the test moves it.
  const controlled = (count: number) => {
    let clock = 0;
    const releases: Array<() => void> = [];
    const draws = Array.from(
      { length: count },
      (_, index) => () =>
        new Promise<number>((resolve) => {
          releases.push(() => resolve(index));
        })
    );
    const release = async (at: number) => {
      await ticks(10);
      clock = at;
      releases.shift()?.();
      await ticks(10);
    };
    return { draws, release, now: () => clock };
  };

  it('times a queued draw from its request, so it includes the wait', async () => {
    const { draws, release, now } = controlled(2);
    const running = timeDraws(draws, { inFlight: 1, now });
    await release(10);
    await release(25);
    const [first, second] = await running;
    expect(first).toEqual({ value: 0, ms: 10 });
    expect(second).toEqual({ value: 1, ms: 25 });
  });

  it("times draws in turn from each one's own start", async () => {
    const { draws, release, now } = controlled(2);
    const running = timeDraws(draws, { now });
    await release(10);
    await release(25);
    const [first, second] = await running;
    expect(first).toEqual({ value: 0, ms: 10 });
    expect(second).toEqual({ value: 1, ms: 15 });
  });
});
