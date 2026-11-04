/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { closeMetricGrid, contentRows, fixedTracks } from './draw';

describe('markup for takumi', () => {
  it('closes a Metric grid template left open', () => {
    expect(
      closeMetricGrid(
        '<div style="grid-template-columns: repeat(3, minmax(0, 1fr);">'
      )
    ).toBe('<div style="grid-template-columns: repeat(3, minmax(0, 1fr));">');
  });

  it('leaves a closed grid template alone', () => {
    const closed =
      '<div style="grid-template-columns: repeat(3, minmax(0, 1fr));">';
    expect(closeMetricGrid(closed)).toBe(closed);
  });

  it('turns min-content rows into auto and the free row into 1fr', () => {
    expect(
      contentRows('.a{grid-template-rows: min-content auto min-content}')
    ).toBe('.a{grid-template-rows:auto 1fr auto}');
  });

  it('fixes auto-fill tracks to the count that fits the width', () => {
    expect(fixedTracks('repeat(auto-fill, minmax(150px, 1fr))', 480)).toBe(
      'repeat(3, minmax(150px, 1fr))'
    );
  });
});
