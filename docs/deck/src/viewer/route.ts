/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type SurfaceId, surfaces, type Theme } from '../surfaces';

import { type DeckSlide, type SourceId, sourceIds } from './types';

/** What the URL holds: which slide, which surface, which scheme, and which source is open beside it. */
export interface Route {
  index: number;
  surface: SurfaceId;
  theme: Theme;
  source: SourceId | undefined;
}

const isSurface = (value: string | null): value is SurfaceId =>
  surfaces.some(({ id }) => id === value);

const isSource = (value: string | null): value is SourceId =>
  sourceIds.some((id) => id === value);

const slideIndex = (
  slides: readonly DeckSlide[],
  value: string | null
): number => {
  if (value === null) {
    return 0;
  }
  const bySlug = slides.findIndex(({ slug }) => slug === value);
  if (bySlug !== -1) {
    return bySlug;
  }
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number < slides.length
    ? number
    : 0;
};

/** Reads `?slide=<slug|number>&surface=<id>&theme=<light|dark>&source=<jsx|json>`, falling back per field. */
export const readRoute = (
  slides: readonly DeckSlide[],
  search: string,
  fallbackTheme: Theme
): Route => {
  const params = new URLSearchParams(search);
  const surface = params.get('surface');
  const theme = params.get('theme');
  const source = params.get('source');
  // `surface=jsx` links predate the source panel; they open it instead.
  const legacySource = surface === 'jsx' ? 'jsx' : undefined;
  return {
    index: slideIndex(slides, params.get('slide')),
    surface: isSurface(surface) ? surface : 'slide',
    theme: theme === 'light' || theme === 'dark' ? theme : fallbackTheme,
    source: isSource(source) ? source : legacySource,
  };
};

/** The query string for a route, keeping any other parameters in `search`. */
export const writeRoute = (
  slides: readonly DeckSlide[],
  { index, surface, theme, source }: Route,
  search = ''
): string => {
  const params = new URLSearchParams(search);
  params.set('slide', slides[index]?.slug ?? '');
  params.set('surface', surface);
  params.set('theme', theme);
  if (source) {
    params.set('source', source);
  } else {
    params.delete('source');
  }
  return `?${params.toString()}`;
};
