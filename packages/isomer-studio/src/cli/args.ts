/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';
import type { ConfigLoader } from '../node/load_config';
import type { ReportFormat } from '../node/report';

export const DEFAULT_PORT = 5179;

interface SharedArgs {
  /** Absolute; `--config` and `--out` resolve against it. */
  cwd: string;
  config?: string | undefined;
  loader: ConfigLoader;
}

export type CliArgs =
  | { command: 'help' }
  | (SharedArgs & { command: 'dev'; port: number; open: boolean })
  | (SharedArgs & { command: 'build'; out: string; base: string })
  | (SharedArgs & {
      command: 'check';
      report?: string | undefined;
      format: ReportFormat;
      png: boolean;
      surfaces?: StudioSurface[] | undefined;
    });

export const USAGE = `Usage: isomer-studio <command> [options]

Commands:
  dev     Serve the Studio with live reload.
  build   Write the Studio as a static site.
  check   Render every example on every surface, and exit 1 on a failure.

Options for every command:
  --config <file>        Default: isomer-studio.config.{ts,tsx,js} in --cwd.
  --cwd <dir>            Resolves --config, --out and --report. Default: the current directory.
  --loader tsx|none      How the config is imported in Node. Default: tsx.

dev:
  --port <number>        Default: ${DEFAULT_PORT}.
  --open                 Open the Studio in a browser.

build:
  --out <dir>            Default: dist/studio.
  --base <path>          The URL path the site is served from. Default: ./

check:
  --report <file>        Also write the report to a file.
  --format json|junit    The report's format. Default: json.
  --png                  Also rasterize every example.
  --surfaces <list>      Comma-separated surfaces to render. Default: every surface the runtime has.
`;

/** Bad command-line input. Identify it by `name`. */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

const COMMANDS = ['dev', 'build', 'check'] as const;

const isCommand = (value: string): value is (typeof COMMANDS)[number] =>
  COMMANDS.some((command) => command === value);

const isSurface = (value: string): value is StudioSurface =>
  Object.hasOwn(SURFACE_LABELS, value);

const oneOf = <T extends string>(
  flag: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  if (value === undefined) {
    return fallback;
  }
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new UsageError(
      `--${flag} must be one of ${allowed.join(', ')}; got ${value}.`
    );
  }
  return match;
};

const parsePort = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new UsageError(`--port must be a port number; got ${value}.`);
  }
  return port;
};

const parseSurfaces = (
  value: string | undefined
): StudioSurface[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const unknown = names.filter((name) => !isSurface(name));
  if (unknown.length) {
    throw new UsageError(
      `--surfaces has unknown surfaces: ${unknown.join(', ')}. Known: ${Object.keys(SURFACE_LABELS).join(', ')}.`
    );
  }
  return names.filter(isSurface);
};

/** A trailing slash, so asset URLs resolve inside the base rather than beside it. */
export const normalizeBase = (base: string): string =>
  base.endsWith('/') ? base : `${base}/`;

const OPTIONS = {
  config: { type: 'string' },
  cwd: { type: 'string' },
  loader: { type: 'string' },
  port: { type: 'string' },
  open: { type: 'boolean' },
  out: { type: 'string' },
  base: { type: 'string' },
  report: { type: 'string' },
  format: { type: 'string' },
  png: { type: 'boolean' },
  surfaces: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
} as const;

const ONLY: Readonly<Record<string, readonly string[]>> = {
  port: ['dev'],
  open: ['dev'],
  out: ['build'],
  base: ['build'],
  report: ['check'],
  format: ['check'],
  png: ['check'],
  surfaces: ['check'],
};

export const parseCliArgs = (
  argv: readonly string[],
  processCwd: string = process.cwd()
): CliArgs => {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
    });
  } catch (error) {
    throw new UsageError(
      error instanceof Error ? error.message : String(error)
    );
  }
  const { values, positionals } = parsed;
  const [command, ...extra] = positionals;
  if (values.help || command === undefined || command === 'help') {
    return { command: 'help' };
  }
  if (!isCommand(command)) {
    throw new UsageError(`Unknown command: ${command}.`);
  }
  if (extra.length) {
    throw new UsageError(`Unexpected arguments: ${extra.join(' ')}.`);
  }
  const misplaced = Object.keys(values).filter(
    (flag) => ONLY[flag] !== undefined && !ONLY[flag].includes(command)
  );
  if (misplaced.length) {
    throw new UsageError(
      `${misplaced.map((flag) => `--${flag}`).join(', ')} does not apply to ${command}.`
    );
  }

  const shared: SharedArgs = {
    cwd: resolve(processCwd, values.cwd ?? '.'),
    config: values.config,
    loader: oneOf('loader', values.loader, ['tsx', 'none'], 'tsx'),
  };
  switch (command) {
    case 'dev':
      return {
        ...shared,
        command,
        port: parsePort(values.port),
        open: values.open ?? false,
      };
    case 'build':
      return {
        ...shared,
        command,
        out: resolve(shared.cwd, values.out ?? 'dist/studio'),
        base: normalizeBase(values.base ?? './'),
      };
    case 'check':
      return {
        ...shared,
        command,
        report:
          values.report === undefined
            ? undefined
            : resolve(shared.cwd, values.report),
        format: oneOf('format', values.format, ['json', 'junit'], 'json'),
        png: values.png ?? false,
        surfaces: parseSurfaces(values.surfaces),
      };
  }
};
