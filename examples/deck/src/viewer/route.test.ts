/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { readRoute, writeRoute } from './route';
import type { DeckSlide } from './types';

const slides: DeckSlide[] = ['title', 'render'].map((slug) => ({
  slug,
  composition: { type: 'view', title: slug, body: [] },
  sources: [],
}));

describe('route slide', () => {
  it('reads a slide by slug or by position, falling back to the first', () => {
    const at = (search: string) => readRoute(slides, search, 'light').index;
    expect(at('')).toBe(0);
    expect(at('?slide=render')).toBe(1);
    expect(at('?slide=1')).toBe(1);
    expect(at('?slide=2')).toBe(0);
    expect(at('?slide=-1')).toBe(0);
    expect(at('?slide=missing')).toBe(0);
  });

  it('writes the slide by slug, keeping other parameters', () => {
    const route = readRoute(slides, '', 'light');
    const url = new URLSearchParams(
      writeRoute(slides, { ...route, index: 1 }, '?deck=a1')
    );
    expect(url.get('slide')).toBe('render');
    expect(url.get('deck')).toBe('a1');
  });
});

describe('route theme, surface, and source', () => {
  it('reads each, falling back per field', () => {
    expect(
      readRoute(slides, '?theme=dark&surface=html&source=json', 'light')
    ).toMatchObject({ theme: 'dark', surface: 'html', source: 'json' });
    expect(
      readRoute(slides, '?theme=sepia&surface=pdf&source=yaml', 'dark')
    ).toMatchObject({ theme: 'dark', surface: 'slide', source: undefined });
  });

  it('reads `surface=jsx` as an unknown surface', () => {
    expect(readRoute(slides, '?surface=jsx', 'light')).toMatchObject({
      surface: 'slide',
      source: undefined,
    });
  });

  it('round-trips through the URL', () => {
    const route = {
      ...readRoute(slides, '', 'light'),
      index: 1,
      theme: 'dark' as const,
      surface: 'markdown' as const,
      source: 'jsx' as const,
    };
    expect(readRoute(slides, writeRoute(slides, route), 'light')).toEqual(
      route
    );
    expect(
      writeRoute(slides, { ...route, source: undefined }, '?source=json')
    ).not.toContain('source=');
  });
});

describe('route builds', () => {
  it('builds by default and starts finished', () => {
    const route = readRoute(slides, '?slide=render', 'light');
    expect(route).toMatchObject({ index: 1, build: undefined, builds: true });
  });

  it('reads a partial build and builds turned off', () => {
    expect(readRoute(slides, '?slide=render&build=2', 'light').build).toBe(2);
    expect(readRoute(slides, '?builds=off', 'light').builds).toBe(false);
  });

  it('ignores a build that is not a whole number', () => {
    expect(readRoute(slides, '?build=-1', 'light').build).toBeUndefined();
    expect(readRoute(slides, '?build=two', 'light').build).toBeUndefined();
  });

  it('writes build and builds only when they differ from the default', () => {
    const route = readRoute(slides, '?slide=render', 'light');
    expect(writeRoute(slides, route)).not.toMatch(/build/);
    const partial = writeRoute(slides, { ...route, build: 2, builds: true });
    expect(readRoute(slides, partial, 'light').build).toBe(2);
    const off = writeRoute(slides, { ...route, builds: false }, '?build=3');
    expect(off).toContain('builds=off');
    expect(off).not.toContain('build=3');
  });
});
