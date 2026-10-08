/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

export interface StaticServer {
  /** The site's URL, ending in `base`. */
  url: string;
  close: () => Promise<void>;
}

/** Serves `dir` under `base` only, as a static host such as GitHub Pages would, and 404s everything else. */
export const serveStatic = async (
  dir: string,
  base: string
): Promise<StaticServer> => {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const inside = pathname.startsWith(base)
      ? pathname.slice(base.length)
      : undefined;
    const relativePath =
      inside === undefined ? undefined : normalize(inside || 'index.html');
    if (relativePath === undefined || relativePath.startsWith('..')) {
      response.writeHead(404).end();
      return;
    }
    readFile(join(dir, relativePath)).then(
      (body) => {
        response.writeHead(200, {
          'content-type':
            CONTENT_TYPES[extname(relativePath)] ?? 'application/octet-stream',
        });
        response.end(body);
      },
      () => response.writeHead(404).end()
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}${base}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};
