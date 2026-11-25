/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';

/** One column of a suite's table. */
export interface Measure {
  key: string;
  label: string;
  digits: number;
}

export interface Scenario {
  name: string;
  about: string;
}

/** What one fresh child process measured for one scenario. */
export type RunRecord = { scenario: string } & Record<string, number | string>;

export interface Spread {
  median: number;
  min: number;
  max: number;
}

export interface Environment {
  node: string;
  v8: string;
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string;
  totalMemoryMb: number;
  /** The cgroup v2 memory limit, when the process runs under one. */
  cgroupMemoryLimitMb: number | null;
  nodeFlags: readonly string[];
  env: {
    NODE_ENV: string | null;
    NODE_OPTIONS: string | null;
    MALLOC_ARENA_MAX: string | null;
    UV_THREADPOOL_SIZE: string | null;
  };
  commit: string | null;
  /** True when tracked files differed from `commit`, so it alone can't reproduce the run. Absent in older results. */
  uncommitted?: boolean;
  /** Resolved versions of the packages measured and their heavy dependencies. */
  packages: Record<string, string>;
}

export interface BenchResult {
  schemaVersion: 1;
  suite: string;
  about: string;
  environment: Environment;
  runsPerScenario: number;
  measures: readonly Measure[];
  scenarios: readonly Scenario[];
  runs: readonly RunRecord[];
  summary: Record<string, Record<string, Spread>>;
}

export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  if (middle === undefined) {
    throw new Error('median of no values');
  }
  return middle;
};

/** Each measure's median, min and max over each scenario's runs. */
export const summarize = (
  runs: readonly RunRecord[],
  scenarios: readonly Scenario[],
  measures: readonly Measure[]
): BenchResult['summary'] =>
  Object.fromEntries(
    scenarios.map(({ name }) => {
      const own = runs.filter(({ scenario }) => scenario === name);
      return [
        name,
        Object.fromEntries(
          measures.flatMap(({ key }) => {
            const values = own
              .map((run) => run[key])
              .filter((value): value is number => typeof value === 'number');
            return values.length === 0
              ? []
              : [
                  [
                    key,
                    {
                      median: median(values),
                      min: Math.min(...values),
                      max: Math.max(...values),
                    },
                  ],
                ];
          })
        ),
      ];
    })
  );

/**
 * The lowest `memory.max` from the process's own cgroup v2 up to the root,
 * in bytes; `null` when nothing above it sets one. `selfCgroup` is
 * `/proc/self/cgroup`; `readMax` reads a cgroup directory's `memory.max`.
 */
export const cgroupLimitBytes = (
  selfCgroup: string,
  readMax: (cgroup: string) => string | undefined
): number | null => {
  const line = selfCgroup.split('\n').find((each) => each.startsWith('0::'));
  if (line === undefined) {
    return null;
  }
  const parts = line.slice(3).trim().split('/').filter(Boolean);
  const limits = parts
    .map((_, at) => `/${parts.slice(0, parts.length - at).join('/')}`)
    .concat('/')
    .map((cgroup) => readMax(cgroup)?.trim())
    .filter((raw): raw is string => raw !== undefined && raw !== 'max')
    .map(Number);
  return limits.length === 0 ? null : Math.min(...limits);
};

const readOr = (path: string): string | undefined => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
};

const cgroupMemoryLimitMb = (): number | null => {
  const self = readOr('/proc/self/cgroup');
  if (self === undefined) {
    return null;
  }
  const bytes = cgroupLimitBytes(self, (cgroup) =>
    readOr(`/sys/fs/cgroup${cgroup === '/' ? '' : cgroup}/memory.max`)
  );
  return bytes === null ? null : bytes / 1024 / 1024;
};

export const describeEnvironment = ({
  commit,
  uncommitted,
  packages,
  nodeFlags,
}: Pick<
  Environment,
  'commit' | 'uncommitted' | 'packages' | 'nodeFlags'
>): Environment => ({
  node: process.version,
  v8: process.versions.v8,
  platform: process.platform,
  arch: process.arch,
  cpus: cpus().length,
  cpuModel: cpus()[0]?.model.trim() ?? 'unknown',
  totalMemoryMb: Math.round(totalmem() / 1024 / 1024),
  cgroupMemoryLimitMb: cgroupMemoryLimitMb(),
  nodeFlags,
  env: {
    NODE_ENV: process.env.NODE_ENV ?? null,
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
    MALLOC_ARENA_MAX: process.env.MALLOC_ARENA_MAX ?? null,
    UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE ?? null,
  },
  commit,
  ...(uncommitted === undefined ? {} : { uncommitted }),
  packages,
});

export const describeEnvironmentLine = ({
  node,
  platform,
  arch,
  cpuModel,
  cpus: cores,
  totalMemoryMb,
  cgroupMemoryLimitMb: limit,
  env: { NODE_ENV: nodeEnv, NODE_OPTIONS: nodeOptions },
  commit,
  uncommitted,
}: Environment): string =>
  [
    `Node ${node}`,
    `${platform} ${arch}`,
    `${cpuModel} (${cores} cores)`,
    `${Math.round(totalMemoryMb / 1024)} GB`,
    ...(limit === null ? [] : [`cgroup limit ${Math.round(limit)} MB`]),
    `NODE_ENV ${nodeEnv ?? 'unset'}`,
    ...(nodeOptions === null ? [] : [`NODE_OPTIONS \`${nodeOptions}\``]),
    ...(commit === null
      ? []
      : [
          `commit \`${commit.slice(0, 8)}\`${uncommitted === true ? ' with uncommitted changes' : ''}`,
        ]),
  ].join(', ');

/** Escapes text for a Markdown table cell. */
export const tableText = (text: string): string =>
  text.replace(/[\\|]/g, '\\$&');

const cell = (spread: Spread | undefined, digits: number) => {
  if (spread === undefined) {
    return '';
  }
  const text = spread.median.toFixed(digits);
  // A tiny negative difference rounds to `-0.0`.
  return Number(text) === 0 ? (0).toFixed(digits) : text;
};

/** A row per scenario and a column per measure, each cell the median of the runs. */
export const toMarkdown = ({
  measures,
  scenarios,
  summary,
}: Pick<BenchResult, 'measures' | 'scenarios' | 'summary'>): string =>
  [
    `| Scenario | ${measures.map(({ label }) => label).join(' | ')} |`,
    `| --- | ${measures.map(() => '---:').join(' | ')} |`,
    ...scenarios.map(
      ({ name }) =>
        `| \`${tableText(name)}\` | ${measures
          .map(({ key, digits }) => cell(summary[name]?.[key], digits))
          .join(' | ')} |`
    ),
  ].join('\n');
