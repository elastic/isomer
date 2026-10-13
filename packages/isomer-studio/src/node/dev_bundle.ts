/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from 'node:http';
import { dirname } from 'node:path';

import react from '@vitejs/plugin-react';
import type { EnvironmentModuleNode, InlineConfig, Plugin } from 'vite';
import { normalizePath, searchForWorkspaceRoot } from 'vite';

import {
  appEntry,
  browserModule,
  PACKAGE_DIR,
  RUNS_FROM_SOURCE,
} from './app_bundle';

const ENTRY = 'virtual:isomer-studio/app';
const RESOLVED_ENTRY = `\0${ENTRY}`;

/** The URL the dev page loads the entry from. */
export const DEV_ENTRY_URL = `/@id/${ENTRY}`;

/** `modules` and every module that imports one of them, transitively. */
export const withImporters = <T extends { importers: Iterable<T> }>(
  modules: Iterable<T>
): Set<T> => {
  const found = new Set<T>();
  const pending = [...modules];
  for (let next = pending.pop(); next; next = pending.pop()) {
    if (!found.has(next)) {
      found.add(next);
      pending.push(...next.importers);
    }
  }
  return found;
};

/** Receives the server-side modules a change invalidates, when they include the config. */
export type ConfigChangeHandler = (
  stale: ReadonlySet<EnvironmentModuleNode>
) => Promise<void>;

const studioEntry = (
  configPath: string,
  onConfigChange: ConfigChangeHandler
): Plugin => {
  const configFile = normalizePath(configPath);
  return {
    name: 'isomer-studio-entry',
    resolveId: (id) => (id === ENTRY ? RESOLVED_ENTRY : undefined),
    load: (id) =>
      id === RESOLVED_ENTRY ? appEntry(configPath, 'dev') : undefined,
    hotUpdate: async function ({ modules }) {
      if (this.environment.name !== 'ssr') {
        return;
      }
      const stale = withImporters(modules);
      if (![...stale].some(({ file }) => file === configFile)) {
        return;
      }
      await onConfigChange(stale);
      return [];
    },
  };
};

/** Vite options for `isomer-studio dev`: HMR over `server`, React Fast Refresh, and `onConfigChange` before the browser receives an update that re-runs the config. */
export const devViteConfig = ({
  configPath,
  server,
  onConfigChange,
}: {
  configPath: string;
  server: Server;
  onConfigChange: ConfigChangeHandler;
}): InlineConfig => {
  const root = dirname(configPath);
  return {
    configFile: false,
    root,
    appType: 'custom',
    clearScreen: false,
    logLevel: 'info',
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: { allow: [searchForWorkspaceRoot(root), PACKAGE_DIR] },
    },
    resolve: { dedupe: ['react', 'react-dom'] },
    define: { global: 'globalThis' },
    // The dependency scanner crawls these when `optimizeDeps.entries` is unset; the virtual entry itself is not on disk.
    build: {
      rolldownOptions: {
        input: [configPath, browserModule('mount'), browserModule('dev_host')],
      },
    },
    optimizeDeps: {
      // The scanner ignores tsconfig, so it misses the Emotion JSX runtime the Studio's own `.tsx` compiles to.
      include: RUNS_FROM_SOURCE
        ? ['@elastic/isomer-studio > @emotion/react/jsx-dev-runtime']
        : [],
    },
    plugins: [studioEntry(configPath, onConfigChange), react()],
  };
};
