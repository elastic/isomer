/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { runtime } from '@elastic/isomer-deck/runtime';
import {
  slideOverflow,
  slideOverlaps,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import type { StudioState } from './app';
import { createSlidesHost } from './host/slides_host';
import { registerIsomer } from './mcp_adapter';

/** Open MCP sessions, by session id, with the module evaluation that built each one's tools. */
export type McpSessions = Map<
  string,
  { transport: StreamableHTTPServerTransport; build: object }
>;

// A new object each time Vite re-evaluates this module after the runtime, the pack, or the tools change.
const build = {};

const pngOf =
  ({ takumi }: StudioState) =>
  async (composition: Composition, theme: 'light' | 'dark') =>
    takumi.png(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
        theme,
      })
    );

const layoutOf =
  ({ takumi }: StudioState) =>
  async (composition: Composition) => {
    const layout = await takumi.measure(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
      })
    );
    return { overflow: slideOverflow(layout), overlaps: slideOverlaps(layout) };
  };

const createServer = (state: StudioState, origin: string) => {
  const host = createSlidesHost({
    runtime,
    store: state.store,
    png: pngOf(state),
    layoutOf: layoutOf(state),
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
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, build });
    },
    enableDnsRebindingProtection: true,
    allowedHosts: [`localhost:${port}`, `127.0.0.1:${port}`],
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
