/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import type { Composition } from '@elastic/isomer-sdk';

/** A deck: an ordered list of slide compositions and when it last changed. */
export interface Deck {
  id: string;
  title: string;
  slides: Composition[];
  updatedAt: string;
}

/** A deck without its slides, for listings. */
export interface DeckSummary {
  id: string;
  title: string;
  slideCount: number;
  updatedAt: string;
}

export interface DeckStore {
  list: () => DeckSummary[];
  get: (id: string) => Deck | undefined;
  create: (title: string) => Deck;
  /** Applies `change` to a copy of the deck's slides, then saves and announces it. */
  update: (
    id: string,
    change: (slides: Composition[]) => Composition[]
  ) => Deck;
  remove: (id: string) => boolean;
  /** Calls `listener` with the deck after every change to it; returns the unsubscribe. */
  subscribe: (id: string, listener: (deck: Deck) => void) => () => void;
  /** Calls `listener` after any deck changes; returns the unsubscribe. */
  subscribeAll: (listener: () => void) => () => void;
}

const anyDeck = Symbol('any deck');

const summarize = ({ id, title, slides, updatedAt }: Deck): DeckSummary => ({
  id,
  title,
  slideCount: slides.length,
  updatedAt,
});

const readDecks = (dir: string): Map<string, Deck> => {
  mkdirSync(dir, { recursive: true });
  const decks = new Map<string, Deck>();
  for (const file of readdirSync(dir).filter((name) =>
    name.endsWith('.json')
  )) {
    const deck = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Deck;
    decks.set(deck.id, deck);
  }
  return decks;
};

/** Decks held in memory and mirrored to one JSON file each under `dir`. */
export const createDeckStore = (dir: string): DeckStore => {
  const decks = readDecks(dir);
  const events = new EventEmitter();
  events.setMaxListeners(0);

  const save = (deck: Deck): Deck => {
    decks.set(deck.id, deck);
    writeFileSync(
      join(dir, `${deck.id}.json`),
      `${JSON.stringify(deck, null, 2)}\n`
    );
    events.emit(deck.id, deck);
    events.emit(anyDeck);
    return deck;
  };

  const existing = (id: string): Deck => {
    const deck = decks.get(id);
    if (!deck) {
      throw new Error(
        `no deck "${id}"; call deck_list to see the decks that exist`
      );
    }
    return deck;
  };

  return {
    list: () =>
      [...decks.values()]
        .map(summarize)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    get: (id) => decks.get(id),
    create: (title) =>
      save({
        id: randomUUID().slice(0, 8),
        title,
        slides: [],
        updatedAt: new Date().toISOString(),
      }),
    update: (id, change) => {
      const deck = existing(id);
      return save({
        ...deck,
        slides: change([...deck.slides]),
        updatedAt: new Date().toISOString(),
      });
    },
    remove: (id) => {
      const existed = decks.delete(id);
      rmSync(join(dir, `${id}.json`), { force: true });
      events.emit(anyDeck);
      return existed;
    },
    subscribe: (id, listener) => {
      events.on(id, listener);
      return () => events.off(id, listener);
    },
    subscribeAll: (listener) => {
      events.on(anyDeck, listener);
      return () => events.off(anyDeck, listener);
    },
  };
};
