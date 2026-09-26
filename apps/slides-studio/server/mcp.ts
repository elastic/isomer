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
  slideOverflow,
  slideOverlaps,
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
  'You write slide decks the user watches in the Isomer studio. Read isomer_authoring_guide once, look up the primitives you pick with isomer_describe_primitives (slideFrame included), create a deck with deck_create, then write each slide with deck_set_slide in order. After writing a slide, look at it with deck_render_slide and fix anything crowded or overflowing; each render returns a PNG of up to about 120,000 characters, so render once per change rather than per word. Render a section divider again once its section is written, since its links are checked against the slides that exist. Tell the user the viewer URL deck_create returns: it shows every slide as you write it.';

/** What this host adds to the pack's guide: how its viewer addresses a slide. */
const studioGuide =
  'In this studio, the viewer at `/decks/<id>/present` opens a slide at `?slide=<n>`, counting from 0 with the title slide as 0. A `slideSection` `hrefs` entry is that relative link, e.g. `?slide=2`, one per `contents` line.';

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
  const png = pngOf(state);
  const server = createIsomerMcpServer({
    name: 'isomer-slides-studio',
    version: '0.0.0',
    instructions,
    runtime,
    guide: `${slidesAuthoringGuide}\n\n${studioGuide}`,
    rules: slidesAuthoringRules,
    frame: slideDeckFrame,
    heading: false,
    image: (composition, { theme }) =>
      png(composition, theme === 'dark' ? 'dark' : 'light'),
  });
  registerIsomerTools(
    server,
    createDeckTools(
      state.store,
      png,
      layoutOf(state),
      (id) => `${origin}/decks/${id}`
    )
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
