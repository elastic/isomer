/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from the gauge contract (docs/gauge.md) and Lens's
// gauge: its default bounds (`getMinValue`, `getMaxValue`), band stretches
// (`normalizeBands`), band ticks (`getTicksLabels`) and empty-state texts.

import { describe, expect, it } from 'vitest';

import type { Cell, ChartColumn } from '../schema/data';
import type { GaugeNode } from '../schema/gauge';

import { resolveChart } from './resolve';
import { niceMax } from './resolve_gauge';
import { TABLE_CHROME, TRANSPARENT } from './theme';

const number = (id: string): ChartColumn => ({
  id,
  label: id,
  type: 'number',
  role: 'metric',
});

const gauge = (row: Cell[], overrides: Partial<GaugeNode> = {}): GaugeNode => ({
  type: 'gauge',
  shape: 'semiCircle',
  data: {
    columns: [number('v'), number('lo'), number('hi'), number('goal')],
    rows: [row],
  },
  value: { column: 'v' },
  ...overrides,
});

const resolve = (node: GaugeNode, scheme: 'light' | 'dark' = 'light') =>
  resolveChart(node, { scheme });

const RED = { light: '#FF0000', dark: '#880000' };
const BLUE = { light: '#0000FF', dark: '#000088' };

describe('resolveGauge: bounds', () => {
  it('starts at 0 and ends at the value rounded up, as Lens does', () => {
    expect(resolve(gauge([72, null, null, null]))).toMatchObject({
      min: 0,
      max: 100,
    });
    expect(resolve(gauge([8_412, null, null, null])).max).toBe(10_000);
    expect(niceMax(0, 340)).toBe(400);
  });

  it('starts 10 below a value at or below 0', () => {
    expect(resolve(gauge([-25, null, null, null]))).toMatchObject({
      min: -35,
      max: -20,
    });
    expect(resolve(gauge([0, null, null, null])).min).toBe(-10);
  });

  it('takes a goal into the rounded end, and stated bounds as they are', () => {
    expect(
      resolve(gauge([50, null, null, 130], { goal: { column: 'goal' } })).max
    ).toBe(150);
    expect(
      resolve(
        gauge([50, 5, 55, null], {
          min: { column: 'lo' },
          max: { column: 'hi' },
        })
      )
    ).toMatchObject({ min: 5, max: 55 });
  });

  it('ends above a value at its stated start where the offset rounds away', () => {
    const scene = resolve(
      gauge([1e12, 1e12, null, null], { min: { column: 'lo' } })
    );
    expect(scene.max).toBe(1e12 + 1);
    expect(scene.empty).toBeUndefined();
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });

  it('ends at the largest double for a value there', () => {
    const scene = resolve(gauge([Number.MAX_VALUE, null, null, null]));
    expect(scene).toMatchObject({ min: 0, max: Number.MAX_VALUE });
    expect(scene.bands).toMatchObject([{ start: 0, end: Number.MAX_VALUE }]);
    expect(scene.empty).toBeUndefined();
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });

  it('reads the first row with a value', () => {
    const node = gauge([null, null, null, null]);
    node.data.rows.push([7, null, null, null], [9, null, null, null]);
    expect(resolve(node).value).toBe(7);
  });
});

describe('resolveGauge: bands and ticks', () => {
  it('draws one neutral stretch with no bands', () => {
    expect(resolve(gauge([72, 0, 100, null])).bands).toEqual([
      { start: 0, end: 100, color: TABLE_CHROME.light.barTrack },
    ]);
    expect(resolve(gauge([72, 0, 100, null]), 'dark').bands[0]!.color).toBe(
      TABLE_CHROME.dark.barTrack
    );
  });

  it('splits the scale at every band edge within it, transparent where no band covers it', () => {
    const scene = resolve(
      gauge([50, 0, 100, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        colors: {
          bands: [
            { from: -20, to: 30, color: BLUE },
            { from: 60, color: RED },
          ],
        },
      }),
      'dark'
    );
    expect(scene.bands).toEqual([
      { start: 0, end: 30, color: '#000088' },
      { start: 30, end: 60, color: '#FFFFFF00' },
      { start: 60, end: 100, color: '#880000' },
    ]);
  });

  it('colors each stretch of many contiguous bands by its own band, with no gap', () => {
    const count = 40_000;
    const scene = resolve(
      gauge([1, 0, count, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        colors: {
          bands: Array.from({ length: count }, (_, index) => ({
            from: index,
            to: index + 1,
            color: index % 2 ? RED : BLUE,
          })),
        },
      })
    );
    expect(scene.bands).toHaveLength(count);
    expect(
      scene.bands.every(
        ({ start, color }) => color === (start % 2 ? '#FF0000' : '#0000FF')
      )
    ).toBe(true);
  });

  it('places percentage band edges across the largest doubles without overflowing', () => {
    const scene = resolve(
      gauge([0, -1e308, 1e308, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        bandsRange: 'percentage',
        colors: {
          bands: [
            { from: 0, to: 50, color: BLUE },
            { from: 50, to: 100, color: RED },
          ],
        },
      })
    );
    expect(scene.bands).toEqual([
      { start: -1e308, end: 0, color: '#0000FF' },
      { start: 0, end: 1e308, color: '#FF0000' },
    ]);
  });

  it('colors a band on a subnormal scale', () => {
    const tiny = Number.MIN_VALUE;
    const scene = resolve(
      gauge([tiny, 0, 4 * tiny, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        colors: { bands: [{ from: 2 * tiny, to: 3 * tiny, color: BLUE }] },
      })
    );
    expect(scene.bands).toEqual([
      { start: 0, end: 2 * tiny, color: TRANSPARENT },
      { start: 2 * tiny, end: 3 * tiny, color: '#0000FF' },
      { start: 3 * tiny, end: 4 * tiny, color: TRANSPARENT },
    ]);
  });

  it('places percentage band edges on the scale', () => {
    const scene = resolve(
      gauge([50, 100, 300, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        bandsRange: 'percentage',
        colors: {
          bands: [
            { from: 0, to: 25, color: BLUE },
            { from: 25, to: 100, color: RED },
          ],
        },
      })
    );
    expect(scene.bands.map(({ start, end }) => [start, end])).toEqual([
      [100, 150],
      [150, 300],
    ]);
  });

  it('puts band ticks at the edges, leaving out any within a tenth of the scale of a neighbor or the end', () => {
    const scene = resolve(
      gauge([50, 0, 100, null], {
        min: { column: 'lo' },
        max: { column: 'hi' },
        ticks: 'bands',
        colors: {
          bands: [
            { from: 0, to: 5, color: BLUE },
            { from: 5, to: 50, color: RED },
            { from: 50, to: 95, color: BLUE },
            { from: 95, to: 100, color: RED },
          ],
        },
      })
    );
    expect(scene.ticks).toEqual([0, 50, 100]);
  });

  it('draws no ticks when hidden, and lets the engine choose by default', () => {
    expect(
      resolve(gauge([1, null, null, null], { ticks: 'hidden' })).ticks
    ).toEqual([]);
    expect(resolve(gauge([1, null, null, null])).ticks).toBeUndefined();
  });
});

describe('resolveGauge: text', () => {
  it('writes the value as displayed, a goal on the scale, and the labels', () => {
    const node = gauge([72, 0, 100, 80], {
      title: 'CPU',
      min: { column: 'lo' },
      max: { column: 'hi' },
      goal: { column: 'goal' },
      labels: { minor: 'Last hour' },
    });
    node.data.display = { v: ['72 units'] };
    const scene = resolve(node);
    expect(scene).toMatchObject({
      valueText: '72 units',
      goal: { value: 80, text: '80' },
      labels: { major: 'v', minor: 'Last hour' },
      tooltipLabels: { active: 'Current', value: 'v', goal: 'Goal' },
      summary:
        'CPU: v is 72 units, on a scale from 0 to 100, with a goal of 80.',
    });
    expect(resolve({ ...node, labels: { major: false } }).labels.major).toBe(
      ''
    );
    expect(resolve({ ...node, labels: { major: 'Load' } }).labels.major).toBe(
      'Load'
    );
  });

  it('leaves out a goal off the scale', () => {
    expect(
      resolve(
        gauge([50, 0, 100, 120], {
          min: { column: 'lo' },
          max: { column: 'hi' },
          goal: { column: 'goal' },
        })
      ).goal
    ).toBeUndefined();
  });
});

describe('resolveGauge: nothing to draw', () => {
  it.each([
    [[null, null, null, null], {}, 'noResults', 'No results found'],
    [
      [5, 10, 10, null],
      { min: { column: 'lo' }, max: { column: 'hi' } },
      'equalBounds',
      'Minimum and maximum values may not be equal',
    ],
    [
      [5, 20, 10, null],
      { min: { column: 'lo' }, max: { column: 'hi' } },
      'invertedBounds',
      'Minimum value may not be greater than maximum value',
    ],
  ] as const)('%j says %s', (row, overrides, reason, text) => {
    const scene = resolve(gauge([...row], overrides));
    expect(scene.empty).toEqual({ reason, text });
    expect(scene.bands).toEqual([]);
  });
});
