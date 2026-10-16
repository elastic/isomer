/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A slide index from 0 and how many of its builds are shown. */
export interface DeckPlace {
  slide: number;
  step: number;
}

export interface DeckPath {
  /** Absent for the list of decks. */
  deck?: string | undefined;
  /** Absent for the deck's thumbnails. */
  place?: DeckPlace | undefined;
}

const count = (segment: string | undefined): number | undefined =>
  segment !== undefined && /^\d+$/.test(segment) ? Number(segment) : undefined;

/** Reads `<deck>`, `<deck>/<n>` and `<deck>/<n>/<step>`, with `n` counting from 1. A slide that is not a number reads as the first. */
export const parseDeckPath = (path: string): DeckPath => {
  const [deck, slide, step] = path.split('/');
  if (!deck) {
    return {};
  }
  if (slide === undefined || slide === '') {
    return { deck };
  }
  return {
    deck,
    place: {
      slide: Math.max((count(slide) ?? 1) - 1, 0),
      step: count(step) ?? 0,
    },
  };
};

export const formatDeckPath = ({ deck, place }: DeckPath): string =>
  deck === undefined
    ? ''
    : place === undefined
      ? deck
      : `${deck}/${place.slide + 1}/${place.step}`;

/** `place` within a deck whose slides take `builds` steps: an unknown slide falls back to the first, and a step past the last to the slide built. */
export const clampPlace = (
  { slide, step }: DeckPlace,
  builds: readonly number[]
): DeckPlace => {
  const known = slide < builds.length ? slide : 0;
  return { slide: known, step: Math.min(step, builds[known] ?? 0) };
};

/** The next build, or the next slide unbuilt; `undefined` at the end. */
export const stepForward = (
  { slide, step }: DeckPlace,
  builds: readonly number[]
): DeckPlace | undefined =>
  step < (builds[slide] ?? 0)
    ? { slide, step: step + 1 }
    : slide + 1 < builds.length
      ? { slide: slide + 1, step: 0 }
      : undefined;

/** The previous build, or the previous slide built; `undefined` at the start. */
export const stepBack = (
  { slide, step }: DeckPlace,
  builds: readonly number[]
): DeckPlace | undefined =>
  step > 0
    ? { slide, step: step - 1 }
    : slide > 0
      ? { slide: slide - 1, step: builds[slide - 1] ?? 0 }
      : undefined;

export const firstPlace: DeckPlace = { slide: 0, step: 0 };

export const lastPlace = (builds: readonly number[]): DeckPlace => {
  const slide = Math.max(builds.length - 1, 0);
  return { slide, step: builds[slide] ?? 0 };
};
