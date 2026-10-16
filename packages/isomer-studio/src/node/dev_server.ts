/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

import type { Composition } from '@elastic/isomer-sdk';
import { transform } from 'esbuild';
import {
  createServer as createViteServer,
  createServerModuleRunner,
} from 'vite';

import type { StudioConfig } from '../config';
import {
  describeTransformError,
  JSX_TRANSFORM_OPTIONS,
} from '../model/jsx_transform';

import { APP_DIR, renderIndexHtml } from './app_bundle';
import type { ConfigChangeHandler } from './dev_bundle';
import { DEV_ENTRY_URL, devViteConfig } from './dev_bundle';
import type { ConfigLoader } from './load_config';
import {
  assertSingleReact,
  importStudioModule,
  loadStudioConfig,
  studioConfigFrom,
} from './load_config';
import type { NodeRenderers } from './rasterize';
import { createRenderers, imageFontsOf } from './rasterize';

const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 256 * 1024;
/** A whole deck's compositions. */
const MAX_PDF_BODY_BYTES = 8 * 1024 * 1024;
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

const readBody = (
  request: IncomingMessage,
  maxBytes = MAX_BODY_BYTES
): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error(`Request body is over ${maxBytes} bytes.`));
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

const isPdfRequest = (
  value: unknown
): value is { title?: string; compositions: Composition[] } =>
  typeof value === 'object' &&
  value !== null &&
  'compositions' in value &&
  Array.isArray(value.compositions) &&
  value.compositions.length > 0 &&
  value.compositions.every(isComposition) &&
  (!('title' in value) ||
    value.title === undefined ||
    typeof value.title === 'string');

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface DevServerOptions {
  configPath: string;
  port: number;
  loader?: ConfigLoader | undefined;
  log?: ((line: string) => void) | undefined;
}

interface LoadedConfig {
  config: StudioConfig;
  renderers: NodeRenderers | undefined;
}

export interface DevServer {
  url: string;
  close: () => Promise<void>;
}

/** Serves the Studio for `configPath` with hot updates, re-running the Node-side config whenever its modules change. */
export const startDevServer = async ({
  configPath: givenConfigPath,
  port,
  loader,
  log = (line) => process.stdout.write(`${line}\n`),
}: DevServerOptions): Promise<DevServer> => {
  // Vite's module ids and serving allow list compare real paths.
  const configPath = realpathSync(givenConfigPath);
  if (!existsSync(join(APP_DIR, 'index.html'))) {
    throw new Error(
      `The Studio's app assets are missing from ${APP_DIR}. In the Isomer repository, run \`pnpm build\` once.`
    );
  }
  assertSingleReact(configPath);
  if (loader === 'none') {
    log(
      'PNGs render with the config as loaded now: Node caches a plain import(), so restart dev to pick up config or pack changes.'
    );
  }

  const server: Server = createServer();
  const fontFiles = new Set<string>();
  const vite = await createViteServer(
    devViteConfig({
      configPath,
      server,
      onConfigChange: (stale) => reloadConfig(stale),
      reloadsWith: () => fontFiles,
    })
  );
  const runner =
    loader === 'none'
      ? undefined
      : createServerModuleRunner(vite.environments.ssr, { hmr: false });

  const importConfig = async (): Promise<LoadedConfig> => {
    const config = runner
      ? studioConfigFrom(await runner.import(configPath), configPath)
      : await loadStudioConfig(configPath, { loader });
    const fonts = imageFontsOf(config, configPath, async (path) => {
      if (!runner) {
        return importStudioModule(path, { loader });
      }
      const namespace: unknown = await runner.import(path);
      const node = await vite.environments.ssr.moduleGraph.getModuleByUrl(path);
      fontFiles.clear();
      if (node?.file) {
        fontFiles.add(node.file);
      }
      return namespace;
    });
    return { config, renderers: createRenderers(config.runtime, fonts) };
  };

  let loaded = importConfig();

  const reloadConfig: ConfigChangeHandler = async (stale) => {
    if (!runner) {
      return;
    }
    const { evaluatedModules } = runner;
    stale.forEach(({ id }) => {
      const node = id === null ? undefined : evaluatedModules.getModuleById(id);
      if (node) {
        evaluatedModules.invalidateModule(node);
      }
    });
    const previous = loaded;
    loaded = previous.then(importConfig).catch((error: unknown) => {
      log(`Could not reload the Studio config: ${describeError(error)}`);
      return previous;
    });
    await loaded;
  };

  const close = async () => {
    await runner?.close();
    await vite.close();
  };

  try {
    await loaded;
  } catch (error) {
    await close();
    throw error;
  }

  const png = async (request: IncomingMessage, response: ServerResponse) => {
    const { renderers } = await loaded;
    if (!renderers) {
      sendText(response, 404, 'The runtime has no snapshot surface.');
      return;
    }
    try {
      const composition: unknown = JSON.parse(await readBody(request));
      if (!isComposition(composition)) {
        sendText(response, 400, 'Not a composition.');
        return;
      }
      const image = await renderers.png(composition);
      response.writeHead(200, {
        'content-type': 'image/png',
        'cache-control': 'no-store',
      });
      response.end(image);
    } catch (error) {
      sendText(response, 400, describeError(error));
    }
  };

  const pdf = async (request: IncomingMessage, response: ServerResponse) => {
    const { renderers } = await loaded;
    if (!renderers) {
      sendText(response, 404, 'The runtime has no snapshot surface.');
      return;
    }
    try {
      const body: unknown = JSON.parse(
        await readBody(request, MAX_PDF_BODY_BYTES)
      );
      if (!isPdfRequest(body)) {
        sendText(response, 400, 'Not one or more compositions.');
        return;
      }
      const { title, compositions } = body;
      const document = await renderers.pdf(compositions, { title });
      response.writeHead(200, {
        'content-type': 'application/pdf',
        'cache-control': 'no-store',
      });
      response.end(document);
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
    const relativePath = normalize(pathname.slice('/assets/'.length));
    const file = relativePath.startsWith('..')
      ? undefined
      : await readFile(join(ASSETS_DIR, relativePath)).catch(() => undefined);
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

  const serveIndex = async (url: string, response: ServerResponse) => {
    try {
      const { config } = await loaded;
      const html = await vite.transformIndexHtml(
        url,
        renderIndexHtml({
          base: '/',
          title: config.title,
          entry: DEV_ENTRY_URL,
        })
      );
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
    } catch (error) {
      sendText(response, 500, describeError(error));
    }
  };

  server.on('request', (request: IncomingMessage, response: ServerResponse) => {
    if (!isLoopbackHost(request.headers.host)) {
      sendText(response, 403, 'Forbidden host');
      return;
    }
    const url = request.url ?? '/';
    const { pathname } = new URL(url, `http://${HOST}`);
    if (request.method === 'POST' && pathname === '/transform') {
      void transformJsx(request, response);
      return;
    }
    if (request.method === 'POST' && pathname === '/png') {
      void png(request, response);
      return;
    }
    if (request.method === 'POST' && pathname === '/pdf') {
      void pdf(request, response);
      return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      void serveIndex(url, response);
      return;
    }
    if (pathname.startsWith('/assets/')) {
      void serveAsset(pathname, response);
      return;
    }
    vite.middlewares(request, response, () =>
      sendText(response, 404, 'Not found')
    );
  });

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
    await close();
    throw error;
  });

  const address = server.address();
  const boundPort =
    typeof address === 'object' && address !== null ? address.port : port;
  return {
    url: `http://${HOST}:${boundPort}/`,
    close: async () => {
      await close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
