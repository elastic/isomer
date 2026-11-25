/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Bounds } from './bounds';

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
  /**
   * Marks a charts pack for the `charts` suite, which draws its examples with
   * no engine. With `engine`, a module relative to the config exporting
   * `{ createRenderers, stylesheet? }`, it draws them with that engine instead.
   */
  charts?: { engine?: string };
  /** Per suite, what `bench <suite> --check` holds this config's scenarios to. */
  bounds?: Record<string, Bounds>;
}

const isBounds = (value: unknown): value is Bounds =>
  isRecord(value) &&
  Object.values(value).every(
    (measures) =>
      isRecord(measures) &&
      Object.values(measures).every(
        (bound) => typeof bound === 'number' && bound > 0
      )
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const defineBenchConfig = (config: BenchConfig): BenchConfig => config;

/** Why `value` isn't a {@link BenchConfig}, or `undefined` when it is one. */
export const benchConfigProblem = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return 'a config exports an object';
  }
  const { name, entries, build, charts, bounds } = value as Record<
    string,
    unknown
  >;
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
  if (
    charts !== undefined &&
    !(
      isRecord(charts) &&
      (charts.engine === undefined ||
        (typeof charts.engine === 'string' && charts.engine.length > 0))
    )
  ) {
    return '`charts` is an object whose `engine`, if any, is a path';
  }
  if (
    bounds !== undefined &&
    !(isRecord(bounds) && Object.values(bounds).every(isBounds))
  ) {
    return '`bounds` maps each suite to scenarios, then measures, then a positive number';
  }
  return undefined;
};
