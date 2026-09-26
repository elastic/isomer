/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { DeckListing } from '../server/app';
import type { DeckView } from '../server/host/resolve';

export type { DeckListing };

/** A deck as the pages read it: slides with references filled, and the slides as stored. */
export type Deck = DeckView;

/** Every deck, newest first, kept current over server-sent events. */
export const useDeckList = (): DeckListing[] | undefined => {
  const [decks, setDecks] = useState<DeckListing[]>();
  useEffect(() => {
    const source = new EventSource('/api/decks/events');
    source.onmessage = ({ data }: MessageEvent<string>) =>
      setDecks(JSON.parse(data) as DeckListing[]);
    return () => source.close();
  }, []);
  return decks;
};

/** Deletes a deck and its file; the deck list updates over its own event stream. */
export const deleteDeck = async (id: string): Promise<void> => {
  const response = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Could not delete the deck (${response.status}).`);
  }
};

export interface LiveDeck {
  /** `undefined` until the first snapshot arrives. */
  deck: Deck | undefined;
  /** The server has no deck by this id. */
  missing: boolean;
  /** The event stream is open, so changes arrive as they happen. */
  live: boolean;
}

/** One deck, with its references resolved, kept current as the agent writes it. */
export const useDeck = (id: string): LiveDeck => {
  const [state, setState] = useState<LiveDeck>({
    deck: undefined,
    missing: false,
    live: false,
  });
  useEffect(() => {
    setState({ deck: undefined, missing: false, live: false });
    const source = new EventSource(`/api/decks/${id}/events`);
    source.onopen = () => setState((prev) => ({ ...prev, live: true }));
    source.onmessage = ({ data }: MessageEvent<string>) =>
      setState({ deck: JSON.parse(data) as Deck, missing: false, live: true });
    source.onerror = () =>
      setState((prev) => ({
        ...prev,
        live: false,
        missing: !prev.deck && source.readyState === EventSource.CLOSED,
      }));
    return () => source.close();
  }, [id]);
  return state;
};
