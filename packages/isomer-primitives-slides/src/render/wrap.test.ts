/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { contentRight, textRightEdge } from '../primitives/wrap.fixtures';

// A long unbroken token, such as a URL or an identifier, in a display title.
const token = 'x'.repeat(90);

describe('an unbreakable word in a title', () => {
  it('wraps inside the slide in a heading', async () => {
    expect(
      await textRightEdge({ type: 'slideHeading', title: `Refunds ${token}` })
    ).toBeLessThanOrEqual(contentRight);
  });

  it('wraps inside the slide in a title slide', async () => {
    expect(
      await textRightEdge(
        { type: 'slideTitle', title: token.slice(0, 30) },
        'inverse'
      )
    ).toBeLessThanOrEqual(contentRight);
  });
});
