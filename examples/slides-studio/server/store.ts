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
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

import type { Deck, DeckStore, DeckSummary } from './host/deck';

const anyDeck = Symbol('any deck');

/** Every id the store makes or accepts, so an id is always a file name inside its directory. */
const deckId = /^[\w-]+$/;

const isDeckId = (id: string): boolean => deckId.test(id);

const summarize = ({ id, title, slides, updatedAt }: Deck): DeckSummary => ({
  id,
  title,
  slideCount: slides.length,
  updatedAt,
});

const isDeck = (value: unknown, id: string): value is Deck => {
  const deck = value as Partial<Deck> | null;
  return (
    typeof deck === 'object' &&
    deck !== null &&
    deck.id === id &&
    typeof deck.title === 'string' &&
    Array.isArray(deck.slides) &&
    typeof deck.updatedAt === 'string'
  );
};

const readDeck = (dir: string, file: string): Deck | undefined => {
  const id = basename(file, '.json');
  try {
    const deck: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    return isDeckId(id) && isDeck(deck, id) ? deck : undefined;
  } catch {
    return undefined;
  }
};

const readDecks = (dir: string): Map<string, Deck> => {
  mkdirSync(dir, { recursive: true });
  const decks = new Map<string, Deck>();
  const skipped: string[] = [];
  for (const file of readdirSync(dir).filter((name) =>
    name.endsWith('.json')
  )) {
    const deck = readDeck(dir, file);
    if (deck) {
      decks.set(deck.id, deck);
    } else {
      skipped.push(file);
    }
  }
  if (skipped.length > 0) {
    console.warn(
      `slides studio: skipped ${skipped.join(', ')} in ${dir}, which are not decks this studio wrote.`
    );
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
    const file = join(dir, `${deck.id}.json`);
    const partial = join(dir, `.${deck.id}.json.tmp`);
    writeFileSync(partial, `${JSON.stringify(deck, null, 2)}\n`);
    renameSync(partial, file);
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
      if (!isDeckId(id)) {
        return false;
      }
      const existed = decks.delete(id);
      rmSync(join(dir, `${id}.json`), { force: true });
      events.emit(id, undefined);
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
