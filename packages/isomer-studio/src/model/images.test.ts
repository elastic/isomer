/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { imagesEnabled, imagesProblem } from './images';

describe('images', () => {
  it.each([undefined, true])('enables images for %j', (images) => {
    expect(imagesEnabled({ images })).toBe(true);
    expect(imagesProblem({ images })).toBeUndefined();
  });

  it('disables images for false', () => {
    expect(imagesEnabled({ images: false })).toBe(false);
    expect(imagesProblem({ images: false })).toBeUndefined();
  });

  it.each(['false', 'true', 0, 1, null, {}])(
    'disables images and reports %j',
    (images) => {
      expect(imagesEnabled({ images })).toBe(false);
      expect(imagesProblem({ images })).toBe(
        'images must be a boolean; PNGs and PDFs are off.'
      );
    }
  );
});
