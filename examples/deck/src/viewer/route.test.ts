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
