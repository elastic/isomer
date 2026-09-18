/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdownLink } from './format';

describe('markdownLink', () => {
  it('escapes ] and \\ in the label', () => {
    expect(markdownLink('a] b\\c', 'https://example.com')).toBe(
      '[a\\] b\\\\c](https://example.com)'
    );
  });

  it('percent-encodes parens and whitespace in the destination', () => {
    expect(markdownLink('x', 'https://example.com/(a b)')).toBe(
      '[x](https://example.com/%28a%20b%29)'
    );
  });
});
