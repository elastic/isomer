/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { limit } from './limit';

/** One draw's result and how long it took from its request. */
export interface Timed<T> {
  value: T;
  ms: number;
}

/**
 * Runs `draws` one at a time, or with `inFlight`, all requested at once
 * through a {@link limit} of that many (`'all'` for none). Each is timed from
 * its request, so a queued draw's time includes its wait.
 */
export const timeDraws = async <T>(
  draws: ReadonlyArray<() => Promise<T>>,
  {
    inFlight,
    now = () => performance.now(),
  }: { inFlight?: number | 'all'; now?: () => number } = {}
): Promise<Array<Timed<T>>> => {
  const timed = async (draw: () => Promise<T>, from: number) => {
    const value = await draw();
    return { value, ms: now() - from };
  };
  if (inFlight === undefined) {
    const results: Array<Timed<T>> = [];
    for (const draw of draws) {
      results.push(await timed(draw, now()));
    }
    return results;
  }
  if (inFlight !== 'all' && !(Number.isInteger(inFlight) && inFlight >= 1)) {
    throw new RangeError(
      `inFlight ${inFlight}: a whole number of at least 1, or 'all'`
    );
  }
  const limited =
    inFlight === 'all'
      ? (draw: () => Promise<T>) => draw()
      : limit(inFlight, draws.length);
  return Promise.all(draws.map((draw) => timed(() => limited(draw), now())));
};
