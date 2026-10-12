/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Runs `fn` over `items` with at most `limit` in flight at once, keeping input order. */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await fn(items[index]!);
      }
    }
  );
  await Promise.all(workers);
  return results;
};

export const mean = (values: readonly number[]): number | undefined =>
  values.length === 0
    ? undefined
    : values.reduce((sum, n) => sum + n, 0) / values.length;
