/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';

import { deckFonts } from '@elastic/isomer-deck/fonts';
import { runtime } from '@elastic/isomer-deck/runtime';
import {
  createTakumiImageBackend,
  type TakumiImageBackend,
} from '@elastic/isomer-image-takumi';
import type { Composition } from '@elastic/isomer-sdk';

import { handleMcp, type McpSessions } from './mcp';
import { resolveDeck, viewDeck } from './resolve';
import { createDeckStore, type DeckStore, type DeckSummary } from './store';

/** Everything that must outlive a module reload under `vite dev`. */
export interface StudioState {
  store: DeckStore;
  takumi: TakumiImageBackend;
  sessions: McpSessions;
}

const stateKey = Symbol.for('elastic.isomer.slides_studio');

/** One state per process, so HMR keeps decks and connected agents. */
export const studioState = (decksDir: string): StudioState => {
  const holder = globalThis as { [stateKey]?: StudioState };
  holder[stateKey] ??= {
    store: createDeckStore(decksDir),
    takumi: createTakumiImageBackend({ fonts: deckFonts }),
    sessions: new Map(),
  };
  return holder[stateKey];
};

/** A deck as the landing page lists it. */
export interface DeckListing extends DeckSummary {
  /** The first slide, for a thumbnail. Nothing it could reference comes before it, so it needs no resolving. */
  cover?: Composition;
}

const listDecks = (store: DeckStore): DeckListing[] =>
  store.list().map((summary) => {
    const cover = store.get(summary.id)?.slides[0];
    return cover ? { ...summary, cover } : summary;
  });

const json = (res: ServerResponse, body: unknown, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const stream = (
  req: IncomingMessage,
  res: ServerResponse,
  subscribe: (send: () => void) => () => void,
  current: () => unknown
) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = () => res.write(`data: ${JSON.stringify(current())}\n\n`);
  send();
  const unsubscribe = subscribe(send);
  req.on('close', unsubscribe);
};

const deckRoute = /^\/api\/decks\/([\w-]+)(\/events)?$/;

// A page on another origin can send a simple request here, so a change must come from the studio's own pages.
const isSameOrigin = ({ headers: { origin, host } }: IncomingMessage) =>
  origin === undefined || new URL(origin).host === host;
const pngRoute = /^\/png\/([\w-]+)\/(\d+)\.(light|dark)\.png$/;

/** Handles the studio's routes; anything else goes to `next`. */
export const handleStudio = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  decksDir: string
): Promise<void> => {
  const state = studioState(decksDir);
  const { store, takumi } = state;
  const { pathname } = new URL(req.url ?? '/', 'http://studio');

  if (pathname === '/mcp') {
    await handleMcp(req, res, state);
    return;
  }
  if (pathname === '/api/decks') {
    json(res, listDecks(store));
    return;
  }
  if (pathname === '/api/decks/events') {
    stream(
      req,
      res,
      (send) => store.subscribeAll(send),
      () => listDecks(store)
    );
    return;
  }
  const deckMatch = deckRoute.exec(pathname);
  if (deckMatch) {
    const [, id, events] = deckMatch as unknown as [string, string, string?];
    const deck = store.get(id);
    if (!deck) {
      json(res, { error: `no deck "${id}"` }, 404);
      return;
    }
    if (req.method === 'DELETE' && !events) {
      if (!isSameOrigin(req)) {
        json(res, { error: 'cross-origin request refused' }, 403);
        return;
      }
      store.remove(id);
      res.statusCode = 204;
      res.end();
      return;
    }
    if (events) {
      stream(
        req,
        res,
        (send) => store.subscribe(id, send),
        () => viewDeck(store.get(id) ?? deck)
      );
      return;
    }
    json(res, viewDeck(deck));
    return;
  }
  const pngMatch = pngRoute.exec(pathname);
  if (pngMatch) {
    const [, id, index, theme] = pngMatch as unknown as [
      string,
      string,
      string,
      'light' | 'dark',
    ];
    const deck = store.get(id);
    const composition = deck
      ? resolveDeck(deck).slides[Number(index)]
      : undefined;
    if (!composition) {
      json(res, { error: 'no such slide' }, 404);
      return;
    }
    const png = await takumi.png(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
        theme,
      })
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.end(png);
    return;
  }
  next();
};

/** Where decks persist by default: `.decks/` beside the app. */
export const defaultDecksDir = (root: string): string => join(root, '.decks');
