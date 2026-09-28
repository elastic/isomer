/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';

import type { Composition } from '@elastic/isomer-sdk';

import { DECK_GONE_EVENT } from '../common/events';

import type { DeckStore, DeckSummary } from './host/deck';
import { resolveDeck, viewDeck } from './host/resolve';
import { handleMcp } from './mcp';
import { slideRenderers } from './render';
import { studioState } from './state';

export { studioState } from './state';

/** A deck as the landing page lists it. */
export interface DeckListing extends DeckSummary {
  /** The first slide, its references filled, for a thumbnail. */
  cover?: Composition;
}

const listDecks = (store: DeckStore): DeckListing[] =>
  store.list().map((summary) => {
    const deck = store.get(summary.id);
    const cover = deck ? resolveDeck(deck).slides[0] : undefined;
    return cover ? { ...summary, cover } : summary;
  });

const json = (res: ServerResponse, body: unknown, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

/** Server-sent events: `current()` now and after each change, until it is `undefined`, which sends {@link DECK_GONE_EVENT} and ends. */
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
  let unsubscribe = () => {};
  const send = () => {
    const value = current();
    if (value === undefined) {
      unsubscribe();
      res.end(`event: ${DECK_GONE_EVENT}\ndata: \n\n`);
      return;
    }
    res.write(`data: ${JSON.stringify(value)}\n\n`);
  };
  send();
  unsubscribe = subscribe(send);
  req.on('close', unsubscribe);
};

const deckRoute = /^\/api\/decks\/([\w-]+)(\/events)?$/;

/** The origin's host, or `undefined` for an opaque (`null`) or unparsable one. */
const originHost = (origin: string): string | undefined => {
  try {
    return new URL(origin).host || undefined;
  } catch {
    return undefined;
  }
};

// A page on another origin can send a simple request here, so a change must come from the studio's own pages.
const isSameOrigin = ({ headers: { origin, host } }: IncomingMessage) =>
  origin === undefined || originHost(origin) === host;
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
        () => {
          const current = store.get(id);
          return current ? viewDeck(current) : undefined;
        }
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
    const png = await slideRenderers(takumi).png(composition, theme);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.end(png);
    return;
  }
  next();
};

/** Where decks persist by default: `.decks/` beside the app. */
export const defaultDecksDir = (root: string): string => join(root, '.decks');
