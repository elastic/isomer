/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What the benchmarks measure for one primitive pack, or anything else a host
 * loads beside the SDK, such as a chart engine. A config is plain data: the
 * suites read it in the parent process and never load it where they measure.
 */
export interface BenchConfig {
  /** Names the pack's rows, as `<name>:host`. */
  name: string;
  /** Specifiers a host imports, resolved from the config's directory; the first is the pack's main entry. */
  entries: readonly string[];
  /**
   * `source` when the entries are TypeScript a host transpiles itself, such as
   * a Kibana package: the suites bundle each one with esbuild first, keeping
   * built JavaScript external. Defaults to `built`.
   */
  build?: 'built' | 'source';
}

export const defineBenchConfig = (config: BenchConfig): BenchConfig => config;

/** Why `value` isn't a {@link BenchConfig}, or `undefined` when it is one. */
export const benchConfigProblem = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return 'a config exports an object';
  }
  const { name, entries, build } = value as Partial<BenchConfig>;
  if (typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)) {
    return '`name` is lowercase letters, digits and dashes';
  }
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    !entries.every((entry) => typeof entry === 'string' && entry.length > 0)
  ) {
    return '`entries` lists at least one specifier';
  }
  if (build !== undefined && build !== 'built' && build !== 'source') {
    return "`build` is 'built' or 'source'";
  }
  return undefined;
};
