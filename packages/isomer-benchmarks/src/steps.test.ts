/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createStepRecorder, type StepProbe } from './steps';

const MB = 1024 * 1024;

/** A process whose heap, RSS and clock move only when a step says so. */
const fakeProcess = () => {
  const state = {
    heap: 10 * MB,
    rss: 50 * MB,
    peak: 60 * MB,
    now: 0,
    garbage: 0,
  };
  const probe: StepProbe = {
    gc: () => {
      state.heap -= state.garbage;
      state.garbage = 0;
    },
    heapUsed: () => state.heap,
    rss: () => state.rss,
    peakRss: () => state.peak,
    now: () => state.now,
  };
  return { state, probe };
};

describe('createStepRecorder', () => {
  it('separates what a step keeps from what it only allocated', async () => {
    const { state, probe } = fakeProcess();
    const { step, records } = createStepRecorder(probe);
    const result = await step('build', () => {
      state.heap += 8 * MB;
      state.garbage = 6 * MB;
      state.rss += 4 * MB;
      state.peak += 2 * MB;
      state.now += 12;
      return 'built';
    });
    expect(result).toBe('built');
    expect(records).toEqual([
      {
        step: 'build',
        ms: 12,
        heapRetainedMb: 2,
        heapAllocatedMb: 8,
        rssDeltaMb: 4,
        peakRaiseMb: 2,
      },
    ]);
  });

  it('awaits an async step', async () => {
    const { state, probe } = fakeProcess();
    const { step, records } = createStepRecorder(probe);
    await step('later', async () => {
      await Promise.resolve();
      state.now += 5;
    });
    expect(records[0]?.ms).toBe(5);
  });
});
