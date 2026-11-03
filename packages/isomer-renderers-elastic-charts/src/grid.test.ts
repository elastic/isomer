/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act as testUtilsAct } from 'react-dom/test-utils';
import type { MetricNode } from '@elastic/isomer-primitives-charts/model';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** `react` exports `act` from 18.3; `react-dom/test-utils` covers earlier 18.x. */
const { act = testUtilsAct, createElement } = React as typeof React & {
  act?: typeof testUtilsAct;
};

const grids: unknown[][][] = [];

vi.mock('@elastic/charts', async (actual) => ({
  ...(await actual<typeof import('@elastic/charts')>()),
  Chart: ({ children }: { children: React.ReactNode }) => children,
  Settings: () => null,
  Metric: ({ data }: { data: unknown[][] }) => {
    grids.push(data);
    return null;
  },
}));

const { MetricChart } = await import('./metric');

const drawn = (node: MetricNode) => {
  grids.length = 0;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(MetricChart, { node, scheme: 'light' }));
  });
  act(() => root.unmount());
  return grids
    .at(-1)!
    .map((row) =>
      row.map((cell) =>
        cell === undefined ? undefined : (cell as { value: unknown }).value
      )
    );
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('MetricChart grid', () => {
  it('lays the tiles out row by row', () => {
    expect(
      drawn({
        type: 'metric',
        columns: 2,
        tiles: [
          { key: 'a', value: 'x' },
          { key: 'b', value: 'y' },
          { key: 'c', value: 'z' },
        ],
      })
    ).toEqual([['x', 'y'], ['z']]);
  });

  it('pads the tiles with empty cells, row by row', () => {
    expect(
      drawn({
        type: 'metric',
        columns: 2,
        placeholders: 2,
        tiles: [{ key: 'a', value: 'x' }],
      })
    ).toEqual([['x', undefined], [undefined]]);
  });

  it('draws a grid of placeholders alone', () => {
    expect(drawn({ type: 'metric', tiles: [], placeholders: 2 })).toEqual([
      [undefined, undefined],
    ]);
  });

  it('draws an empty grid for no tiles', () => {
    expect(drawn({ type: 'metric', tiles: [] })).toEqual([]);
  });
});
