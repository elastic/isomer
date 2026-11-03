/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  colorForValue,
  type CustomPalette,
  customPalette,
  paletteBounds,
} from './palette';

// The first two suites port Kibana's own cases and expected values:
// `charts/public/services/palettes/helpers.test.ts` (`workoutColorForValue`) and
// `expression_metric/public/utils/palette_data_bounds.test.ts`.

const colors = ['red', 'green', 'blue', 'yellow'];
const bounds = { min: 0, max: 200 };

describe('colorForValue matches workoutColorForValue', () => {
  const number: CustomPalette = {
    continuity: 'above',
    colors,
    range: 'number',
    rangeMin: 0,
    rangeMax: 200,
    stops: [],
  };
  const percent: CustomPalette = { ...number, range: 'percent', rangeMax: 100 };
  const stops = [20, 40, 60, 80];

  it.each<[string, number, CustomPalette, string | undefined]>([
    ['number, evenly spread', 123, number, 'blue'],
    [
      'number, top band without continuity',
      190,
      { ...number, continuity: 'none' },
      'yellow',
    ],
    ['number, custom stops', 50, { ...number, stops }, 'blue'],
    [
      'number, above rangeMax',
      123,
      { ...number, rangeMax: 100, stops },
      'yellow',
    ],
    [
      'number, above an infinite rangeMax',
      123,
      { ...number, continuity: 'all', rangeMax: Infinity, stops },
      'yellow',
    ],
    [
      'number, above rangeMax, continuity below',
      123,
      { ...number, continuity: 'below', rangeMax: 100, stops },
      undefined,
    ],
    [
      'number, above rangeMax, continuity none',
      123,
      { ...number, continuity: 'none', rangeMax: 100, stops },
      undefined,
    ],
    [
      'number, below rangeMin, continuity below',
      10,
      { ...number, continuity: 'below', rangeMin: 20, rangeMax: 100, stops },
      'red',
    ],
    [
      'number, below rangeMin, continuity all',
      10,
      { ...number, continuity: 'all', rangeMin: 20, rangeMax: 100, stops },
      'red',
    ],
    [
      'number, below rangeMin, continuity above',
      0,
      { ...number, rangeMin: 10, rangeMax: 100, stops },
      undefined,
    ],
    [
      'number, below rangeMin, continuity none',
      0,
      { ...number, continuity: 'none', rangeMin: 10, rangeMax: 100, stops },
      undefined,
    ],
    ['percent, evenly spread', 123, percent, 'blue'],
    [
      'percent, top band without continuity',
      190,
      { ...percent, continuity: 'none' },
      'yellow',
    ],
    ['percent, custom stops', 113, { ...percent, stops }, 'blue'],
    [
      'percent, above rangeMax',
      123,
      { ...percent, rangeMax: 90, stops },
      'yellow',
    ],
    [
      'percent, above rangeMax, continuity all',
      123,
      { ...percent, continuity: 'all', rangeMax: 90, stops },
      'yellow',
    ],
    [
      'percent, above rangeMax, continuity below',
      190,
      { ...percent, continuity: 'below', rangeMax: 90, stops },
      undefined,
    ],
    [
      'percent, above rangeMax, continuity none',
      190,
      { ...percent, continuity: 'none', rangeMax: 90, stops },
      undefined,
    ],
    [
      'percent, below rangeMin, continuity below',
      10,
      { ...percent, continuity: 'below', rangeMin: 20, rangeMax: 100, stops },
      'red',
    ],
    [
      'percent, below rangeMin, continuity all',
      10,
      { ...percent, continuity: 'all', rangeMin: 20, rangeMax: 100, stops },
      'red',
    ],
    [
      'percent, below rangeMin, continuity above',
      0,
      { ...percent, rangeMin: 10, rangeMax: 100, stops },
      undefined,
    ],
    [
      'percent, below rangeMin, continuity none',
      0,
      { ...percent, continuity: 'none', rangeMin: 10, rangeMax: 100, stops },
      undefined,
    ],
  ])('%s', (_, value, palette, expected) => {
    expect(colorForValue(value, palette, bounds)).toBe(expected);
  });
});

describe('paletteBounds matches getDataBoundsForPalette', () => {
  it('centers a single metric with no max', () => {
    expect(paletteBounds([100], { breakdown: false, row: 0 })).toEqual({
      min: 0,
      max: 200,
    });
    expect(paletteBounds([-100], { breakdown: false, row: 0 })).toEqual({
      min: -200,
      max: 0,
    });
  });

  it("uses the row's max", () => {
    expect(
      paletteBounds([200], { max: [100], breakdown: false, row: 0 })
    ).toEqual({ min: 0, max: 100 });
    expect(
      paletteBounds([200, 400], { max: [100, 150], breakdown: false, row: 1 })
    ).toEqual({ min: 0, max: 150 });
  });

  it('spans the metric across a breakdown with no max', () => {
    expect(
      paletteBounds([-100, 100, 200, 300], { breakdown: true, row: 0 })
    ).toEqual({ min: -100, max: 300 });
  });

  it("uses the row's max across a breakdown", () => {
    const metric = [-100, 100, 200, 300];
    const max = [200, 250, 300, 400];
    expect(paletteBounds(metric, { max, breakdown: true, row: 2 })).toEqual({
      min: 0,
      max: 300,
    });
    expect(paletteBounds(metric, { max, breakdown: true, row: 0 })).toEqual({
      min: 0,
      max: 200,
    });
  });
});

describe('customPalette', () => {
  // The saved palette of the "[Logs] Web Traffic" sample dashboard's metric.
  const saved = {
    rangeType: 'number' as const,
    rangeMin: 0,
    rangeMax: null,
    continuity: 'above' as const,
    stops: [
      { color: '#D23115', stop: 500 },
      { color: '#FCC400', stop: 1000 },
      { color: '#68BC00', stop: 1640 },
    ],
    colorStops: [
      { color: '#D23115', stop: 0 },
      { color: '#FCC400', stop: 500 },
      { color: '#68BC00', stop: 1000 },
    ],
  };

  it('takes positions from `stops`, not `colorStops`, as `computePaletteParams` does', () => {
    const palette = customPalette(saved);
    expect(palette.stops).toEqual([500, 1000, 1640]);
    expect(palette.colors).toEqual(['#D23115', '#FCC400', '#68BC00']);
    expect(palette.rangeMin).toBe(0);
    expect(palette.rangeMax).toBe(Number.POSITIVE_INFINITY);
  });

  it('colors the sample by its stops', () => {
    const palette = customPalette(saved);
    expect(colorForValue(499, palette, bounds)).toBe('#D23115');
    expect(colorForValue(500, palette, bounds)).toBe('#FCC400');
    expect(colorForValue(1200, palette, bounds)).toBe('#68BC00');
    expect(colorForValue(5000, palette, bounds)).toBe('#68BC00');
  });

  it('defaults an unset range to the first and last stop, as the palette function does', () => {
    const palette = customPalette({
      ...saved,
      continuity: 'none',
      rangeMin: null,
    });
    expect(palette.rangeMin).toBe(500);
    expect(palette.rangeMax).toBe(1640);
  });
});
