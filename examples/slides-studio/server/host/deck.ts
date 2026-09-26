/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
