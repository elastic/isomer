/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import { runtime } from '../common/runtime';

import { registerIsomer } from './adapters/mcp';
import { createSlidesHost } from './host/slides_host';
import { slideRenderers } from './render';
import type { StudioState } from './state';

// A new object each time Vite re-evaluates this module after the runtime, the pack, or the tools change.
const build = {};

/** The names the endpoint answers on, with the port it is served from; a request from any other host or origin is refused. */
const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

const createServer = (state: StudioState, origin: string) => {
  const host = createSlidesHost({
    runtime,
    store: state.store,
    ...slideRenderers(state.takumi),
    viewerUrl: (id) => `${origin}/decks/${id}`,
  });
  const server = new McpServer(
    { name: 'isomer-slides-studio', version: '0.0.0' },
    { instructions: host.instructions }
  );
  registerIsomer(server, host);
  return server;
};

/** Streamable HTTP for MCP clients: one server and transport per session. */
export const handleMcp = async (
  req: IncomingMessage,
  res: ServerResponse,
  state: StudioState
): Promise<void> => {
  const { sessions } = state;
  const header = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(header) ? header[0] : header;
  const existing = sessionId ? sessions.get(sessionId) : undefined;
  if (existing && existing.build !== build) {
    // The MCP spec has a client answer 404 by initializing again, so it picks up the current tools.
    sessions.delete(sessionId!);
    await existing.transport.close();
    res.statusCode = 404;
    res.end('The studio changed since this session began; start a new one.');
    return;
  }
  if (existing) {
    await existing.transport.handleRequest(req, res);
    return;
  }
  if (sessionId || req.method !== 'POST') {
    res.statusCode = sessionId ? 404 : 400;
    res.end(
      sessionId
        ? 'Unknown MCP session.'
        : 'Start a session with an initialize request.'
    );
    return;
  }
  const port = req.socket.localPort ?? 5178;
  const hosts = LOOPBACK_HOSTNAMES.map((hostname) => `${hostname}:${port}`);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, build });
    },
    enableDnsRebindingProtection: true,
    allowedHosts: hosts,
    allowedOrigins: hosts.map((host) => `http://${host}`),
  });
  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
  };
  // The SDK's own transport misses `Transport` only under `exactOptionalPropertyTypes`.
  await createServer(state, `http://localhost:${port}`).connect(
    transport as Transport
  );
  await transport.handleRequest(req, res);
};
