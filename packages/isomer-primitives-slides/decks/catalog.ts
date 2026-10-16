/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

/** A deck file in `decks/`. */
export interface SavedDeck {
  id: string;
  title: string;
  slides: Composition[];
  updatedAt: string;
}

export interface DeckEntry {
  /** The deck's file name in `decks/`, without `.json`, and its path in the Decks app. */
  id: string;
  title: string;
  /** Imports the deck's file; only the browser calls it. */
  load: () => Promise<SavedDeck>;
}

// `decks.test.ts` validates every file against the pack, which is what makes this a `SavedDeck`.
const fromJson =
  (load: () => Promise<{ default: unknown }>) => async (): Promise<SavedDeck> =>
    (await load()).default as SavedDeck;

/** The decks the Decks app shows, in nav order. */
export const deckCatalog: readonly DeckEntry[] = [
  {
    id: 'isomer-every-surface',
    title: 'Isomer: one composition, every surface',
    load: fromJson(() => import('./isomer-every-surface.json')),
  },
  {
    id: 'distillate-render-reachable-css',
    title: 'Distillate: render-reachable CSS',
    load: fromJson(() => import('./distillate-render-reachable-css.json')),
  },
  {
    id: 'distillate-one-style-source',
    title: 'Distillate: one style source, two outputs',
    load: fromJson(() => import('./distillate-one-style-source.json')),
  },
  {
    id: 'elastic-one-platform',
    title: 'Elastic: search, observability, and security on one platform',
    load: fromJson(() => import('./elastic-one-platform.json')),
  },
];
