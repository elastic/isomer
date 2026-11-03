/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { matchesForbidden } from './forbidden_specifier.js';

describe('matchesForbidden', () => {
  it('covers a package and its subpaths only', () => {
    expect(matchesForbidden('react', 'react')).toBe(true);
    expect(matchesForbidden('react/jsx-runtime', 'react')).toBe(true);
    expect(matchesForbidden('react-dom', 'react')).toBe(false);
    expect(matchesForbidden('@kbn/foo', '@kbn')).toBe(true);
  });

  it('covers Node built-ins in both spellings under `node:`', () => {
    for (const specifier of [
      'node:fs',
      'fs',
      'path',
      'stream',
      'fs/promises',
      'node:fs/promises',
    ]) {
      expect(matchesForbidden(specifier, 'node:')).toBe(true);
    }
    expect(matchesForbidden('fs-extra', 'node:')).toBe(false);
    expect(matchesForbidden('react', 'node:')).toBe(false);
  });
});
