/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdown } from './index';

describe('slideTitle lede markdown link', () => {
  it('escapes a label containing ] and a destination containing )', () => {
    const md = markdown({
      type: 'slideTitle',
      title: 'T',
      lede: [
        { type: 'link', text: 'a] link', href: 'https://example.com/(x)' },
      ],
    });
    expect(md).toContain('[a\\] link](https://example.com/%28x%29)');
  });
});
