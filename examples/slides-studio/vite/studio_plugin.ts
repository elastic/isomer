/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'vite';

type StudioModule = typeof import('../server/app');

const entry = '/server/app.ts';

/**
 * Serves the studio's API, MCP endpoint, and PNGs from the dev server.
 * Server modules load through `ssrLoadModule`, so workspace TypeScript runs
 * without a build.
 */
export const studioServer = (): Plugin => {
  let root = process.cwd();
  return {
    name: 'isomer-slides-studio',
    configResolved: (config) => {
      root = config.root;
    },
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url ?? '/', 'http://studio');
        if (
          pathname !== '/mcp' &&
          !pathname.startsWith('/api/') &&
          !pathname.startsWith('/png/')
        ) {
          next();
          return;
        }
        (server.ssrLoadModule(entry) as Promise<StudioModule>)
          .then(({ defaultDecksDir, handleStudio }) =>
            handleStudio(req, res, next, defaultDecksDir(root))
          )
          .catch(next);
      });
    },
  };
};
