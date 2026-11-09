/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartEventSchema } from '@elastic/isomer-primitives-charts/schema';

import { markSelectEvent, signalBrushEvent } from './events';
import { brushExample, vegaExample } from './schema/examples';
import type { VegaNode } from './schema/node';

const DAY = 86_400_000;
const START = Date.UTC(2026, 2, 1);

describe('markSelectEvent', () => {
  it('selects the rows sharing the datum’s dimension values', () => {
    const event = markSelectEvent(vegaExample, { day: 'Wed', errors: 41 });
    expect(event).toEqual({
      kind: 'select',
      target: 'mark',
      node: 'checkout-errors',
      rows: [2],
      columns: ['day'],
      values: { day: 'Wed' },
      description: 'Day: Wed',
    });
    expect(chartEventSchema.parse(event)).toEqual(event);
  });

  it('matches an aggregated datum by the dimensions it keeps, and dates as times', () => {
    const node: VegaNode = {
      ...brushExample,
      interactions: { select: ['mark'] },
    };
    expect(
      markSelectEvent(node, { day: new Date(START + DAY), requests: 9 })?.rows
    ).toEqual([1]);
    expect(markSelectEvent(node, { day: START + 2 * DAY })?.description).toBe(
      'Day: Mar 3'
    );
  });

  it.each([
    ['a node without `mark` selection', brushExample, { day: START }],
    ['a node without an id', { ...vegaExample, id: undefined }, { day: 'Wed' }],
    ['a datum with no dimension', vegaExample, { errors: 41 }],
    ['a datum matching no row', vegaExample, { day: 'Sun' }],
    ['no datum', vegaExample, undefined],
  ])('raises nothing for %s', (_name, node, datum) => {
    expect(markSelectEvent(node as VegaNode, datum)).toBeUndefined();
  });
});

describe('signalBrushEvent', () => {
  it('orders the range and formats it as the column does', () => {
    const event = signalBrushEvent(brushExample, [
      START + 3 * DAY,
      new Date(START),
    ]);
    expect(event).toEqual({
      kind: 'brush',
      node: 'requests-brush',
      column: 'day',
      range: [START, START + 3 * DAY],
      values: {},
      description: 'Day: Mar 1 to Mar 4',
    });
    expect(chartEventSchema.parse(event)).toEqual(event);
  });

  it.each([[null], [[1]], [[1, 'x']], [[1, Number.NaN]]])(
    'raises nothing for %j',
    (value) => {
      expect(signalBrushEvent(brushExample, value)).toBeUndefined();
    }
  );
});
