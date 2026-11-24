/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What one step cost, in MB and ms. */
export interface StepRecord {
  step: string;
  ms: number;
  /** Heap still held after the step and a GC, with its result kept alive. */
  heapRetainedMb: number;
  /** Net heap growth across the step, before the GC; a GC during the step hides what it collected. */
  heapGrowthMb: number;
  rssDeltaMb: number;
  /** How far the step raised the process's high-water RSS. */
  peakRaiseMb: number;
}

export interface StepProbe {
  gc: () => void;
  heapUsed: () => number;
  rss: () => number;
  /** The process's high-water RSS, in bytes. */
  peakRss: () => number;
  now: () => number;
}

const mb = (bytes: number) => bytes / 1024 / 1024;

/** The probe for a Node process run with `--expose-gc`. */
export const processProbe = (): StepProbe => {
  const { gc } = globalThis as { gc?: () => void };
  if (gc === undefined) {
    throw new Error('Run with --expose-gc to attribute steps.');
  }
  return {
    gc,
    heapUsed: () => process.memoryUsage().heapUsed,
    rss: () => process.memoryUsage().rss,
    peakRss: () => process.resourceUsage().maxRSS * 1024,
    now: () => performance.now(),
  };
};

/**
 * Attributes memory and time to named steps. Each step's result stays
 * reachable until {@link StepRecorder.release}, so a later step's numbers
 * exclude what an earlier one built.
 */
export interface StepRecorder {
  step: <T>(name: string, run: () => T | Promise<T>) => Promise<T>;
  records: readonly StepRecord[];
  release: () => void;
}

export const createStepRecorder = (
  probe: StepProbe = processProbe()
): StepRecorder => {
  const records: StepRecord[] = [];
  let held: unknown[] = [];
  return {
    records,
    release: () => {
      held = [];
    },
    step: async (name, run) => {
      const { gc, heapUsed, rss, peakRss, now } = probe;
      gc();
      const heapBefore = heapUsed();
      const rssBefore = rss();
      const peakBefore = peakRss();
      const started = now();
      const result = await run();
      const ms = now() - started;
      const heapGrowth = heapUsed() - heapBefore;
      held.push(result);
      gc();
      records.push({
        step: name,
        ms,
        heapRetainedMb: mb(heapUsed() - heapBefore),
        heapGrowthMb: mb(heapGrowth),
        rssDeltaMb: mb(rss() - rssBefore),
        peakRaiseMb: mb(peakRss() - peakBefore),
      });
      return result;
    },
  };
};
