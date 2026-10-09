/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, sep } from 'node:path';

import type { Composition } from '@elastic/isomer-sdk';
import type { Plugin } from 'esbuild';
import { context, transform } from 'esbuild';

import type { StudioConfig } from '../config';
import {
  describeTransformError,
  JSX_TRANSFORM_OPTIONS,
} from '../model/jsx_transform';

import { APP_DIR, appBuildOptions, renderIndexHtml } from './app_bundle';
import type { ConfigLoader } from './load_config';
import { loadStudioConfig } from './load_config';
import type { NodeRasterizer } from './rasterize';
import { createRasterizer } from './rasterize';

const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 256 * 1024;
const ASSETS_DIR = join(APP_DIR, 'assets');

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`Request body is over ${MAX_BODY_BYTES} bytes.`));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });

const sendText = (response: ServerResponse, status: number, text: string) => {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
};

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** Whether a `Host` header names the loopback listener, which a DNS-rebinding page's own hostname does not. */
export const isLoopbackHost = (host: string | undefined): boolean => {
  if (host === undefined) {
    return false;
  }
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
};

/** Shape only: the snapshot surface validates the rest and draws what it can. */
const isComposition = (value: unknown): value is Composition =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string';

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface DevServerOptions {
  configPath: string;
  port: number;
  loader?: ConfigLoader | undefined;
  log?: ((line: string) => void) | undefined;
}

export interface DevServer {
  url: string;
  close: () => Promise<void>;
}

/** Serves the Studio for `configPath`, rebuilding on change and reloading open tabs and the Node-side config. */
export const startDevServer = async ({
  configPath,
  port,
  loader,
  log = (line) => process.stdout.write(`${line}\n`),
}: DevServerOptions): Promise<DevServer> => {
  let config: StudioConfig = await loadStudioConfig(configPath, { loader });
  let rasterize: NodeRasterizer | undefined = createRasterizer(config.runtime);
  let outputs = new Map<string, Uint8Array>();
  const listeners = new Set<ServerResponse>();
  const outdir = join(APP_DIR, 'dev-assets');
  let markFirstBuild = () => {};
  const firstBuild = new Promise<void>((resolve) => (markFirstBuild = resolve));

  if (loader === 'none') {
    log(
      'PNGs render with the config as loaded now: Node caches a plain import(), so restart dev to pick up config or pack changes.'
    );
  }

  const reloadConfig = async () => {
    if (loader === 'none') {
      return;
    }
    try {
      config = await loadStudioConfig(configPath, { loader });
      rasterize = createRasterizer(config.runtime);
    } catch (error) {
      log(`Could not reload the Studio config: ${describeError(error)}`);
    }
  };

  const inMemory: Plugin = {
    name: 'isomer-studio-in-memory',
    setup: (build) => {
      let isFirst = true;
      build.onEnd(async ({ errors, outputFiles = [] }) => {
        if (errors.length) {
          markFirstBuild();
          return;
        }
        outputs = new Map(
          outputFiles.map(({ path, contents }) => [
            `/assets/${relative(outdir, path).split(sep).join('/')}`,
            contents,
          ])
        );
        if (!isFirst) {
          await reloadConfig();
          listeners.forEach((listener) =>
            listener.write('event: reload\ndata: {}\n\n')
          );
        }
        isFirst = false;
        markFirstBuild();
        log(`Isomer Studio built at ${new Date().toLocaleTimeString()}`);
      });
    },
  };

  const bundler = await context({
    ...appBuildOptions({
      configPath,
      mode: 'dev',
      assetsDir: outdir,
      plugins: [inMemory],
    }),
    write: false,
  });

  const png = async (request: IncomingMessage, response: ServerResponse) => {
    if (!rasterize) {
      sendText(response, 404, 'The runtime has no snapshot surface.');
      return;
    }
    try {
      const composition: unknown = JSON.parse(await readBody(request));
      if (!isComposition(composition)) {
        sendText(response, 400, 'Not a composition.');
        return;
      }
      const image = await rasterize(composition);
      response.writeHead(200, {
        'content-type': 'image/png',
        'cache-control': 'no-store',
      });
      response.end(image);
    } catch (error) {
      sendText(response, 400, describeError(error));
    }
  };

  const transformJsx = async (
    request: IncomingMessage,
    response: ServerResponse
  ) => {
    try {
      const { code } = await transform(
        await readBody(request),
        JSX_TRANSFORM_OPTIONS
      );
      response.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
      });
      response.end(code);
    } catch (error) {
      sendText(response, 400, describeTransformError(error));
    }
  };

  const serveAsset = async (pathname: string, response: ServerResponse) => {
    const built = outputs.get(pathname);
    const relativePath = normalize(pathname.slice('/assets/'.length));
    const file =
      built ??
      (relativePath.startsWith('..')
        ? undefined
        : await readFile(join(ASSETS_DIR, relativePath)).catch(
            () => undefined
          ));
    if (!file) {
      sendText(response, 404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'content-type':
        CONTENT_TYPES[extname(pathname)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(file);
  };

  const serve = (request: IncomingMessage, response: ServerResponse) => {
    if (!isLoopbackHost(request.headers.host)) {
      sendText(response, 403, 'Forbidden host');
      return;
    }
    const { pathname } = new URL(request.url ?? '/', `http://${HOST}`);
    if (request.method === 'POST' && pathname === '/transform') {
      void transformJsx(request, response);
      return;
    }
    if (request.method === 'POST' && pathname === '/png') {
      void png(request, response);
      return;
    }
    if (pathname === '/events') {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      response.write(': connected\n\n');
      listeners.add(response);
      request.on('close', () => listeners.delete(response));
      return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(renderIndexHtml({ base: '/', title: config.title }));
      return;
    }
    if (pathname.startsWith('/assets/')) {
      void serveAsset(pathname, response);
      return;
    }
    sendText(response, 404, 'Not found');
  };

  await bundler.watch();
  await firstBuild;
  const server: Server = createServer(serve);
  await new Promise<void>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) =>
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`Port ${port} is in use; pass --port.`)
          : error
      )
    );
    server.listen(port, HOST, () => resolve());
  }).catch(async (error: unknown) => {
    await bundler.dispose();
    throw error;
  });

  const address = server.address();
  const boundPort =
    typeof address === 'object' && address !== null ? address.port : port;
  return {
    url: `http://${HOST}:${boundPort}/`,
    close: async () => {
      listeners.forEach((listener) => listener.end());
      await bundler.dispose();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
