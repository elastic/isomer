/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { TakumiMeasuringBackend } from '@elastic/isomer-image-takumi';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMcp } from './mcp';
import type { StudioState } from './state';
import { createDeckStore } from './store';

const initialize = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.0.0' },
  },
});

let server: Server;
let port: number;
let state: StudioState;

/** An `initialize` POST with explicit `host` and `origin` headers, which `fetch` cannot set. */
const post = (
  headers: Record<string, string>
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/mcp',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
          // The answer is the first complete server-sent event; the stream may stay open.
          if (body.includes('\n\n')) {
            resolve({ status: res.statusCode ?? 0, body });
          }
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.end(initialize);
  });

beforeEach(async () => {
  state = {
    store: createDeckStore(mkdtempSync(join(tmpdir(), 'studio-mcp-'))),
    takumi: {} as TakumiMeasuringBackend,
    sessions: new Map(),
  };
  server = createServer((req, res) => {
    void handleMcp(req, res, state);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  ({ port } = server.address() as AddressInfo);
});

afterEach(async () => {
  await Promise.all(
    [...state.sessions.values()].map(({ transport }) => transport.close())
  );
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

describe('handleMcp', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'opens a session for %s on its port',
    async (hostname) => {
      const host = `${hostname}:${port}`;
      expect((await post({ host })).status).toBe(200);
      expect((await post({ host, origin: `http://${host}` })).status).toBe(200);
      expect(state.sessions.size).toBe(2);
    }
  );

  it('serves the studio host’s instructions', async () => {
    const { body } = await post({ host: `localhost:${port}` });
    expect(body).toContain('"name":"isomer-slides-studio"');
    expect(body).toContain('deck_create');
  });

  it.each([
    ['another origin', { origin: 'http://evil.example' }],
    ['an opaque origin', { origin: 'null' }],
    ['another port', { origin: 'http://localhost:1' }],
    ['another host', { host: 'evil.example' }],
  ])('refuses %s', async (_label, headers) => {
    expect((await post({ host: `localhost:${port}`, ...headers })).status).toBe(
      403
    );
    expect(state.sessions.size).toBe(0);
  });
});
