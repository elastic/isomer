/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clampPlace,
  formatDeckPath,
  lastPlace,
  parseDeckPath,
  stepBack,
  stepForward,
} from './deck_route';

const builds = [0, 2, 0];

describe('parseDeckPath', () => {
  it.each([
    ['', {}],
    ['isomer', { deck: 'isomer' }],
    ['isomer/', { deck: 'isomer' }],
    ['isomer/3', { deck: 'isomer', place: { slide: 2, step: 0 } }],
    ['isomer/3/1', { deck: 'isomer', place: { slide: 2, step: 1 } }],
    ['isomer/0/x', { deck: 'isomer', place: { slide: 0, step: 0 } }],
    ['isomer/nope', { deck: 'isomer', place: { slide: 0, step: 0 } }],
  ])('reads %j', (path, expected) => {
    expect(parseDeckPath(path)).toEqual(expected);
  });

  it('round-trips through formatDeckPath', () => {
    for (const path of ['', 'isomer', 'isomer/3/1']) {
      expect(formatDeckPath(parseDeckPath(path))).toBe(path);
    }
  });
});

describe('clampPlace', () => {
  it('falls back to the first slide and caps the step at its builds', () => {
    expect(clampPlace({ slide: 9, step: 4 }, builds)).toEqual({
      slide: 0,
      step: 0,
    });
    expect(clampPlace({ slide: 1, step: 9 }, builds)).toEqual({
      slide: 1,
      step: 2,
    });
  });
});

describe('stepping', () => {
  it('steps through builds, then slides, and stops at the ends', () => {
    const forward = [];
    for (
      let place = stepForward({ slide: 0, step: 0 }, builds);
      place;
      place = stepForward(place, builds)
    ) {
      forward.push(place);
    }
    expect(forward).toEqual([
      { slide: 1, step: 0 },
      { slide: 1, step: 1 },
      { slide: 1, step: 2 },
      { slide: 2, step: 0 },
    ]);
    expect(stepBack({ slide: 2, step: 0 }, builds)).toEqual({
      slide: 1,
      step: 2,
    });
    expect(stepBack({ slide: 0, step: 0 }, builds)).toBeUndefined();
    expect(lastPlace(builds)).toEqual({ slide: 2, step: 0 });
  });
});
