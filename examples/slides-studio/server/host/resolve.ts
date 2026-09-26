/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSlideRenders } from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import type { Deck } from './deck';

const named = (slides: readonly Composition[]) =>
  slides.map((composition, index) => ({ slug: String(index), composition }));

/**
 * A deck with every `slideRender` reference, a slide index as a string,
 * filled in from its own slides. One that no longer resolves (a slide moved
 * or was removed) draws its placeholder rather than breaking the deck.
 */
/** A deck as its viewers read it: references filled for drawing, and the slides as stored for showing their source. */
export interface DeckView extends Deck {
  stored: Composition[];
}

/** {@link resolveDeck} with the stored slides alongside. */
export const viewDeck = (deck: Deck): DeckView => ({
  ...resolveDeck(deck),
  stored: deck.slides,
});

export const resolveDeck = (deck: Deck): Deck => ({
  ...deck,
  slides: resolveSlideRenders(named(deck.slides), { onUnresolved: 'leave' }),
});

/** Why `slides` has a reference that cannot be filled, or `undefined` when every one resolves. */
export const unresolvedReference = (
  slides: readonly Composition[]
): string | undefined => {
  try {
    resolveSlideRenders(named(slides));
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
