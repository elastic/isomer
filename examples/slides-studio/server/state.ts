/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type TakumiMeasuringBackend,
} from '@elastic/isomer-image-takumi';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { studioFonts } from './fonts';
import type { DeckStore } from './host/deck';
import { createDeckStore } from './store';

/** Open MCP sessions, by session id, with the module evaluation that built each one's tools. */
export type McpSessions = Map<
  string,
  { transport: StreamableHTTPServerTransport; build: object }
>;

/** Everything that must outlive a module reload under `vite dev`. */
export interface StudioState {
  store: DeckStore;
  takumi: TakumiMeasuringBackend;
  sessions: McpSessions;
}

const stateKey = Symbol.for('elastic.isomer.slides_studio');

/** One state per process, so HMR keeps decks and connected agents. */
export const studioState = (decksDir: string): StudioState => {
  const holder = globalThis as { [stateKey]?: StudioState };
  holder[stateKey] ??= {
    store: createDeckStore(decksDir),
    takumi: createTakumiImageBackend({ fonts: studioFonts }),
    sessions: new Map(),
  };
  return holder[stateKey];
};
