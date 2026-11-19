/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartitionElementEvent } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type { ChartEvent } from '@elastic/isomer-primitives-charts/scene';
import { partitionChartExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import { listen, NODE } from '../../shared/events.fixtures';

import { partitionHandlers, partitionLegendSelect } from './events';

describe('partition events', () => {
  const node = partitionChartExamples.find(({ name }) =>
    name.startsWith('Selectable')
  )!.node;
  const scene = resolveChart(node, { scheme: 'light' });

  /** What Elastic Charts' `onElementClick` reports for a slice: its path's layer values. */
  const clicked = (...keys: string[]): PartitionElementEvent[] => [
    [
      keys.map((key, depth) => ({
        groupByRollup: key,
        value: 0,
        depth: depth + 1,
        sortIndex: 0,
        path: [],
        smAccessorValue: '',
      })),
      { specId: 'partition', key: 'spec{partition}' },
    ],
  ];

  // From the node: "windows" is row 1 of `data`, shown as "Windows", 187 records.
  const windows: ChartEvent = {
    kind: 'select',
    target: 'slice',
    node: NODE,
    rows: [1],
    columns: ['os'],
    values: { os: 'windows' },
    description: 'host.os.type: Windows · Count of records: 187',
  };

  it('raises the hit slice’s selection', () => {
    const { events, env } = listen();
    partitionHandlers(scene, env).onElementClick?.(clicked('windows'));
    expect(events).toEqual([windows]);
  });

  it('raises the legend item’s selection, negated for "Filter out"', () => {
    const { events, env } = listen();
    partitionLegendSelect(scene, env, 'windows', true);
    expect(events).toEqual([{ ...windows, negate: true }]);
  });

  it('offers nothing without slices, a listener or a node id', () => {
    const plain = resolveChart(partitionChartExamples[0]!.node, {
      scheme: 'light',
    });
    expect(partitionHandlers(plain, listen().env)).toEqual({});
    expect(partitionHandlers(scene, { environment: 'browser' })).toEqual({});
  });

  it('selects the innermost slice of a nested path', () => {
    const nested = partitionChartExamples.find(
      ({ name }) => name === 'Nested pie with values'
    )!.node;
    const selectable = resolveChart(
      { ...nested, interactions: { select: ['slice'] } },
      { scheme: 'light' }
    );
    const { events, env } = listen();
    partitionHandlers(selectable, env).onElementClick?.(
      clicked('eu-west-1', 'eu-west-1:web-04')
    );
    expect(events).toEqual([
      {
        kind: 'select',
        target: 'slice',
        node: NODE,
        rows: [3],
        columns: ['region', 'host'],
        values: { region: 'eu-west-1', host: 'web-04' },
        description:
          'cloud.region: eu-west-1 · host.name: web-04 · Sum of bytes: 1 GB',
      },
    ]);
  });
});
