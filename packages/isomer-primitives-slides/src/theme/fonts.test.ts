/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { slideFonts } from '../examples/fonts';

import { slideFontFaces } from './fonts';

describe('slideFontFaces', () => {
  it('names only faces the families ship', () => {
    expect(slideFonts).toHaveLength(slideFontFaces.length);
  });
});
