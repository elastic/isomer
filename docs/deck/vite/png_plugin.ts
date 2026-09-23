/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type Plugin, type UserConfig } from 'vite';

import { pngPath, themes } from '../src/surfaces';

type PngModule = typeof import('../src/png');

const entry = '/src/png.ts';
const request = /\/png\/([\w-]+)\.(light|dark)\.png$/;

/**
 * Takumi is a native addon, so PNGs are drawn in Node: on request under
 * `vite dev`, and emitted as assets when the deck is built.
 */
export const deckPngs = (
  resolve: NonNullable<UserConfig['resolve']>
): Plugin => {
  let root = process.cwd();
  return {
    name: 'isomer-deck-pngs',
    configResolved: (config) => {
      root = config.root;
    },
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const [, slug, theme] = request.exec(req.url ?? '') ?? [];
        if (!slug || (theme !== 'light' && theme !== 'dark')) {
          next();
          return;
        }
        (server.ssrLoadModule(entry) as Promise<PngModule>)
          .then(({ renderPng }) => renderPng(slug, theme))
          .then((png) => {
            if (!png) {
              next();
              return;
            }
            res.setHeader('Content-Type', 'image/png');
            res.end(png);
          })
          .catch(next);
      });
    },
    async generateBundle() {
      const server = await createServer({
        root,
        configFile: false,
        resolve,
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false },
      });
      try {
        const { deck, renderPng } = (await server.ssrLoadModule(
          entry
        )) as PngModule;
        for (const { slug } of deck) {
          for (const theme of themes) {
            const source = await renderPng(slug, theme);
            if (source) {
              this.emitFile({
                type: 'asset',
                fileName: pngPath(slug, theme),
                source,
              });
            }
          }
        }
      } finally {
        await server.close();
      }
    },
  };
};
