/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const { findFloor } = createRequire(import.meta.url)('./container_floor.cjs');

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

  it('says when the command fails at every limit', async () => {
    expect(
      await findFloor({ ...settings, attempt: above(4096, 'heap') })
    ).toEqual({ result: 'fails at every limit', failsAt: 2048, kind: 'heap' });
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
