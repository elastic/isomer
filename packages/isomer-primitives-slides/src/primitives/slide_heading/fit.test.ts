/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { tallestExample } from './examples';
import { headingCrowding, headingStep } from './fit';

describe('headingCrowding', () => {
  it('stays positive and finite for a heading taller than the frame body', () => {
    const crowding = headingCrowding({
      type: 'slideHeading',
      title: 'A title that runs on '.repeat(40),
      lede: 'A lede that runs on and on. '.repeat(80),
    });
    expect(Number.isFinite(crowding)).toBe(true);
    expect(crowding).toBeGreaterThan(1);
  });

  // Crowding is 1 exactly for two title lines at `l` and two lede lines, the reference load budgets are set against.
  it('holds `tallestExample` at the reference: `l`, two title lines, two lede lines', () => {
    expect(headingStep(tallestExample)).toBe('l');
    expect(headingCrowding(tallestExample)).toBe(1);
  });

  it('is 1 or less for a short heading', () => {
    expect(
      headingCrowding({ type: 'slideHeading', title: 'Short' })
    ).toBeLessThanOrEqual(1);
  });
});
