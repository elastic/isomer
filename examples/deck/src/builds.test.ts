/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import {
  SLIDE_BUILDS,
  slideBuildParts,
  slideBuilds,
} from '@elastic/isomer-primitives-slides';
import { describe, expect, it } from 'vitest';

import { deck } from './deck';
import { runtime } from './runtime';

describe('deck builds', () => {
  it.each(deck.map(({ slug, composition }) => [slug, composition] as const))(
    '%s: every part of every building node is found',
    (_slug, composition) => {
      document.body.innerHTML = runtime.surfaces.html.render(composition, {
        heading: false,
        enhancements: [SLIDE_BUILDS],
      }).html;
      const parts = slideBuildParts(
        document.body,
        composition,
        runtime.primitives
      );
      expect(parts.filter(({ found }) => !found)).toEqual([]);
      expect(parts.reduce((total, { count }) => total + count, 0)).toBe(
        slideBuilds(composition, runtime.primitives)
      );
    }
  );

  it('builds the slides whose order is their point', () => {
    const building = deck
      .filter(({ composition }) => slideBuilds(composition) > 0)
      .map(({ slug }) => slug);
    expect(building).toEqual(
      expect.arrayContaining(['render', 'sequence', 'images', 'document'])
    );
  });
});
