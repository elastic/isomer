/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { mrkdwnKeeps } from './slack_text';

describe('mrkdwnKeeps', () => {
  it.each(['*', '_', '~', '`'])('refuses plain text holding %s', (mark) => {
    expect(mrkdwnKeeps([`a ${mark} b`])).toBe(false);
    expect(mrkdwnKeeps(['a b'])).toBe(true);
  });

  it('reads marks text by run', () => {
    expect(mrkdwnKeeps([{ marks: 'a **b** `c`' }])).toBe(true);
    expect(mrkdwnKeeps([{ marks: 'a **b_c**' }])).toBe(false);
    expect(mrkdwnKeeps([{ marks: 'a `<b>`' }])).toBe(false);
    expect(mrkdwnKeeps([{ marks: 'a `&amp;`' }])).toBe(false);
  });

  it.each(['echo ```', 'if a <b> then', 'x &amp; y', 'a &lt; b'])(
    'refuses code %j, which a code block would change',
    (code) => {
      expect(mrkdwnKeeps([{ code }])).toBe(false);
    }
  );

  it('keeps code a code block prints as written', () => {
    expect(mrkdwnKeeps([{ code: 'a => b > c && d *e* _f_' }])).toBe(true);
  });

  it('reads a long input in linear time', () => {
    const started = performance.now();
    expect(mrkdwnKeeps([{ code: `${'&amp'.repeat(100_000)}\`` }])).toBe(true);
    expect(mrkdwnKeeps(['x'.repeat(100_000)])).toBe(true);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
