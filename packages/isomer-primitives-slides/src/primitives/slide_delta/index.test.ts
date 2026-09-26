/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { example, pendingExample } from './examples';
import { markdown, text } from './index';

describe('slideDelta', () => {
  it('renders one line with the change before the body', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"Old checkout 4.2s → New checkout 1.1s. −74%: Median time from Pay to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**Old checkout** 4.2s → **New checkout** 1.1s. **−74%**: Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic."`
    );
  });

  it('marks a missing value as pending and drops a missing change', () => {
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"Before the move 38 → After the move [value pending]. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."`
    );
    expect(markdown(pendingExample)).toMatchInlineSnapshot(
      `"**Before the move** 38 → **After the move** _value pending_. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."`
    );
  });
});
