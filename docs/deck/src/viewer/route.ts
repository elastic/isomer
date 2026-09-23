/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deck } from '../deck';
import { type SurfaceId, surfaces, type Theme } from '../surfaces';

/** What the URL holds: which slide, which surface, which scheme. */
export interface Route {
  index: number;
  surface: SurfaceId;
  theme: Theme;
}

const isSurface = (value: string | null): value is SurfaceId =>
  surfaces.some(({ id }) => id === value);

const slideIndex = (value: string | null): number => {
  if (value === null) {
    return 0;
  }
  const bySlug = deck.findIndex(({ slug }) => slug === value);
  if (bySlug !== -1) {
    return bySlug;
  }
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number < deck.length
    ? number
    : 0;
};

/** Reads `?slide=<slug|number>&surface=<id>&theme=<light|dark>`, falling back per field. */
export const readRoute = (search: string, fallbackTheme: Theme): Route => {
  const params = new URLSearchParams(search);
  const surface = params.get('surface');
  const theme = params.get('theme');
  return {
    index: slideIndex(params.get('slide')),
    surface: isSurface(surface) ? surface : 'slide',
    theme: theme === 'light' || theme === 'dark' ? theme : fallbackTheme,
  };
};

/** The query string for a route. */
export const writeRoute = ({ index, surface, theme }: Route): string =>
  `?${new URLSearchParams({
    slide: deck[index]?.slug ?? '',
    surface,
    theme,
  }).toString()}`;
