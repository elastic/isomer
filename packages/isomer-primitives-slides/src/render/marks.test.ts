/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { marksSlack, parseMarks, stripMarks } from './marks';

describe('marks', () => {
  it('splits code and strong runs', () => {
    expect(parseMarks('Call `parse` before **render**.')).toEqual([
      { kind: 'text', text: 'Call ' },
      { kind: 'code', text: 'parse' },
      { kind: 'text', text: ' before ' },
      { kind: 'strong', text: 'render' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps unpaired markers literal', () => {
    expect(stripMarks('2 * 3 and a ` tick')).toBe('2 * 3 and a ` tick');
  });

  it('does not read strong inside code', () => {
    expect(parseMarks('`**x**`')).toEqual([{ kind: 'code', text: '**x**' }]);
  });

  it('strips marks for text', () => {
    expect(stripMarks('Call `parse` before **render**.')).toBe(
      'Call parse before render.'
    );
  });

  it('converts strong to Slack bold and escapes the rest', () => {
    expect(marksSlack('Call `a<b` before **render** & <go>.')).toBe(
      'Call `a<b` before *render* &amp; &lt;go&gt;.'
    );
  });
});
