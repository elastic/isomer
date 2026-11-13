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
  xyChartExamples,
  type XyChartNode,
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

  it('raises the category at a projected x', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onProjectionClick?.({
      x: START + HOUR,
      y: [],
    });
    expect(events).toEqual([expected('Select an x category')]);
  });

  it('raises nothing for a projected x between positions when the axis states no interval', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onProjectionClick?.({
      x: START + HOUR + 20 * 60_000,
      y: [],
    });
    expect(events).toEqual([]);
  });

  describe('on an axis stating an hourly interval, with data at 00:00 and 02:00', () => {
    const { node } = xyChartExamples.find(
      ({ name }) => name === 'Interactive stacked bars'
    )!;
    // Four rows per hour: without the 01:00 rows, rows 0 to 3 are 00:00 and 4 to 7 are 02:00.
    const scene = resolveChart(
      {
        ...node,
        data: {
          ...node.data,
          rows: node.data.rows.filter((_, row) => row < 4 || row >= 8),
        },
        axes: { x: { scale: 'temporal', interval: HOUR } },
      } as XyChartNode,
      { scheme: 'light' }
    );
    const midnight: ChartEvent = {
      kind: 'select',
      node: NODE,
      target: 'category',
      rows: [0, 1, 2, 3],
      columns: ['time'],
      values: { time: START },
      description: '@timestamp per hour: 00:00',
    };
    const two: ChartEvent = {
      ...midnight,
      rows: [4, 5, 6, 7],
      values: { time: START + 2 * HOUR },
      description: '@timestamp per hour: 02:00',
    };
    const click = (x: number) => {
      const { events, env } = listen();
      xyHandlers(scene, env).onProjectionClick?.({ x, y: [] });
      return events;
    };

    it('raises the category whose bucket a projected x is inside', () => {
      expect(click(START + 20 * 60_000)).toEqual([midnight]);
      expect(click(START + HOUR - 1)).toEqual([midnight]);
      expect(click(START + 2 * HOUR)).toEqual([two]);
      expect(click(START + 3 * HOUR - 1)).toEqual([two]);
    });

    it('raises nothing for the empty bucket between them', () => {
      expect(click(START + HOUR)).toEqual([]);
      expect(click(START + HOUR + 20 * 60_000)).toEqual([]);
    });

    it('raises nothing past the last bucket or before the first', () => {
      expect(click(START + 3 * HOUR)).toEqual([]);
      expect(click(START + 10 * HOUR)).toEqual([]);
      expect(click(START - HOUR)).toEqual([]);
    });
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
