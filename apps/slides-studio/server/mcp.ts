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
  createIsomerMcpServer,
  registerIsomerTools,
} from '@elastic/isomer-mcp';
import {
  slideDeckFrame,
  slidesAuthoringGuide,
  slidesAuthoringRules,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import type { StudioState } from './app';
import { createDeckTools } from './deck_tools';

/** Open MCP sessions, by session id, with the module evaluation that built each one's tools. */
export type McpSessions = Map<
  string,
  { transport: StreamableHTTPServerTransport; build: object }
>;

// A new object each time Vite re-evaluates this module after the runtime, the pack, or the tools change.
const build = {};

const instructions =
  'You write slide decks the user watches in the Isomer studio. Read isomer_authoring_guide once, create a deck with deck_create, then write each slide with deck_set_slide in order. After writing a slide, look at it with deck_render_slide and fix anything crowded or overflowing. Tell the user the viewer URL deck_create returns: it shows every slide as you write it.';

const pngOf =
  ({ takumi }: StudioState) =>
  async (composition: Composition, theme: 'light' | 'dark') =>
    takumi.png(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
        theme,
      })
    );

const createServer = (state: StudioState, origin: string) => {
  const png = pngOf(state);
  const server = createIsomerMcpServer({
    name: 'isomer-slides-studio',
    version: '0.0.0',
    instructions,
    runtime,
    guide: slidesAuthoringGuide,
    rules: slidesAuthoringRules,
    frame: slideDeckFrame,
    heading: false,
    image: (composition, { theme }) =>
      png(composition, theme === 'dark' ? 'dark' : 'light'),
  });
  registerIsomerTools(
    server,
    createDeckTools(state.store, png, (id) => `${origin}/decks/${id}`)
  );
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
