/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  type MetricScene,
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  chartEventExamples,
  partitionChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  legendSelect,
  metricHandlers,
  partitionHandlers,
  partitionLegendSelect,
  seriesOf,
  xyHandlers,
} from './events';
import { seriesData } from './xy';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);
const NODE = 'responses';

const expected = (name: string): ChartEvent => {
  const example = chartEventExamples.find((entry) => entry.name === name);
  if (!example) {
    throw new Error(`no example ${name}`);
  }
  return example.event;
};

const listen = () => {
  const events: ChartEvent[] = [];
  return {
    events,
    env: {
      environment: 'browser' as const,
      nodeId: NODE,
      onEvent: (event: ChartEvent) => events.push(event),
    },
  };
};

/** An element as Elastic Charts' `onElementClick` reports it: geometry value and series identifier. */
const element = (seriesKey: string, mark: number) => {
  const index = seriesOf(xyInteractiveScene).findIndex(
    ({ key }) => key === seriesKey
  );
  const datum = seriesData(seriesOf(xyInteractiveScene)[index]!, index)[mark]!;
  return [
    { x: datum.x, y: datum.y, mark: null, accessor: 'y1', datum },
    {
      specId: `series-${index}`,
      key: `series-${index}`,
      yAccessor: 'y',
      splitAccessors: new Map(),
      seriesKeys: ['y'],
    },
  ];
};

describe('xy events from Elastic Charts callbacks', () => {
  it('raises the datum selection for a clicked bar segment', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onElementClick?.([element('404', 0)]);
    expect(events).toEqual([expected('Select a bar segment')]);
  });

  it('raises the missing bucket with its null value', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onElementClick?.([
      element('\\null', 0),
    ]);
    expect(events).toEqual([expected('Select the missing bucket')]);
  });

  it('takes the first of several elements, as Kibana does', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onElementClick?.([
      element('404', 0),
      element('200', 0),
    ]);
    expect(events).toEqual([expected('Select a bar segment')]);
  });

  it('raises the category a projected x falls in', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onProjectionClick?.({
      x: START + HOUR + 20 * 60_000,
      y: [],
    });
    expect(events).toEqual([expected('Select an x category')]);
  });

  it('raises a brushed range', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onBrushEnd?.({
      x: [START, START + 2 * HOUR],
    });
    expect(events).toEqual([expected('Brush a time range')]);
  });

  it('raises a filtered-out legend item', () => {
    const { events, env } = listen();
    legendSelect(
      xyInteractiveScene,
      env,
      seriesOf(xyInteractiveScene).find(({ key }) => key === 'Other')!,
      true
    );
    expect(events).toEqual([expected('Filter out a legend item')]);
  });

  it('offers nothing without onEvent or a node id', () => {
    expect(
      xyHandlers(xyInteractiveScene, { environment: 'browser', nodeId: NODE })
    ).toEqual({});
    expect(
      xyHandlers(xyInteractiveScene, {
        environment: 'browser',
        onEvent: () => undefined,
      })
    ).toEqual({});
  });

  it('offers nothing the node does not offer', () => {
    const { env } = listen();
    expect(xyHandlers(xyTimeSeriesScene, env)).toEqual({});
  });
});

describe('metric events from Elastic Charts callbacks', () => {
  // Three tiles in rows of two, each selectable by its breakdown value.
  const hosts = ['web-01', 'web-02', 'web-03'];
  const tile = metricSingleValueScene.tiles[0]!;
  const scene: MetricScene = {
    ...metricSingleValueScene,
    interactions: { ...metricSingleValueScene.interactions, select: ['tile'] },
    layout: { ...metricSingleValueScene.layout, columns: 2, rows: 2 },
    tiles: hosts.map((host, row) => ({
      ...tile,
      title: host,
      source: { rows: [row], columns: ['host', 'count'] },
      selection: {
        target: 'tile',
        rows: [row],
        columns: ['host'],
        values: { host },
        description: `host.name: ${host}`,
      },
    })),
  };

  it('maps a grid cell to its tile, row by row', () => {
    const { events, env } = listen();
    metricHandlers(scene, env).onElementClick?.([
      { type: 'metricElementEvent', rowIndex: 1, columnIndex: 0 },
    ]);
    expect(events).toEqual([
      {
        kind: 'select',
        node: NODE,
        target: 'tile',
        rows: [2],
        columns: ['host'],
        values: { host: 'web-03' },
        description: 'host.name: web-03',
      },
    ]);
  });

  it('offers nothing where tiles are not selectable', () => {
    const { env } = listen();
    expect(metricHandlers(metricSingleValueScene, env)).toEqual({});
  });
});

describe('partition events', () => {
  const node = partitionChartExamples.find(({ name }) =>
    name.startsWith('Selectable')
  )!.node;
  const scene = resolveChart(node, { scheme: 'light' });

  /** What Elastic Charts' `onElementClick` reports for a slice: its path's layer values. */
  const clicked = (...keys: string[]) => [
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
