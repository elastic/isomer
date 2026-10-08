/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative } from 'node:path';

import { buildSite } from '../node/build_site';
import { checkStudio } from '../node/check';
import type { DevServer } from '../node/dev_server';
import { startDevServer } from '../node/dev_server';
import {
  loadRenderToString,
  loadStudioConfig,
  resolveConfigPath,
} from '../node/load_config';
import { createRasterizer } from '../node/rasterize';
import { formatReport, summarizeReport } from '../node/report';

import type { CliArgs } from './args';
import { parseCliArgs, USAGE } from './args';

export interface CliIo {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  /** Called with the running dev server, which keeps the process alive until it closes. */
  onDevServer?: ((server: DevServer) => void) | undefined;
}

const OPENERS: Readonly<Partial<Record<NodeJS.Platform, string>>> = {
  darwin: 'open',
  win32: 'explorer',
};

/** Opens `url` in the default browser, reporting a missing or failing opener to `onError`. */
export const openBrowser = (
  url: string,
  onError: (error: Error) => void,
  command = OPENERS[process.platform] ?? 'xdg-open'
): void => {
  const opener = spawn(command, [url], { detached: true, stdio: 'ignore' });
  opener.on('error', onError);
  opener.unref();
};

const runCommand = async (
  args: Exclude<CliArgs, { command: 'help' }>,
  io: CliIo
): Promise<number> => {
  const { cwd, stdout, stderr } = io;
  const configPath = resolveConfigPath(args.cwd, args.config);
  const { loader } = args;

  switch (args.command) {
    case 'dev': {
      const server = await startDevServer({
        configPath,
        port: args.port,
        loader,
        log: (line) => stdout(`${line}\n`),
      });
      stdout(`Isomer Studio: ${server.url}\n`);
      if (args.open) {
        openBrowser(server.url, ({ message }) =>
          stderr(`Could not open a browser: ${message}\n`)
        );
      }
      io.onDevServer?.(server);
      return 0;
    }
    case 'build': {
      const { out, base } = args;
      const { pngs, failures } = await buildSite({
        configPath,
        out,
        base,
        loader,
      });
      failures.forEach((failure) => stderr(`PNG skipped: ${failure}\n`));
      stdout(
        `Wrote the Studio to ${displayPath(cwd, out)} for ${base} with ${pngs} PNGs.\n`
      );
      return 0;
    }
    case 'check': {
      const config = await loadStudioConfig(configPath, { loader });
      const rasterizePng = args.png
        ? createRasterizer(config.runtime)
        : undefined;
      if (args.png && !rasterizePng) {
        stderr('--png: the runtime has no snapshot surface, so no PNGs.\n');
      }
      const report = await checkStudio(config, {
        renderToString: loadRenderToString(configPath),
        surfaces: args.surfaces,
        rasterizePng,
      });
      if (args.report !== undefined) {
        mkdirSync(dirname(args.report), { recursive: true });
        writeFileSync(args.report, formatReport(report, args.format));
      }
      (report.failed ? stderr : stdout)(summarizeReport(report));
      return report.failed ? 1 : 0;
    }
  }
};

/** `path` relative to `cwd` when it is inside it, otherwise absolute. */
const displayPath = (cwd: string, path: string): string => {
  const inside = relative(cwd, path);
  return inside.startsWith('..') || isAbsolute(inside) ? path : inside || '.';
};

const isUsageError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'UsageError';

/** Runs one CLI invocation and resolves its exit code: 0, 1 on a failure, 2 on bad usage. */
export const runCli = async (
  argv: readonly string[],
  io: CliIo
): Promise<number> => {
  try {
    const args = parseCliArgs(argv, io.cwd);
    if (args.command === 'help') {
      io.stdout(USAGE);
      return 0;
    }
    return await runCommand(args, io);
  } catch (error) {
    if (isUsageError(error)) {
      io.stderr(
        `${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`
      );
      return 2;
    }
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
};
