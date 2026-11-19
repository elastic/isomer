/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYChartElementEvent } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  xyInteractiveScene,
  type XyScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  xyChartExamples,
  type XyChartNode,
} from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import { expected, listen, NODE } from '../../shared/events.fixtures';

import { legendSelect, seriesOf, xyHandlers } from './events';
import { seriesData } from './xy';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);

/** An element as Elastic Charts' `onElementClick` reports it: geometry value and series identifier. */
const element = (seriesKey: string, mark: number): XYChartElementEvent => {
  const index = seriesOf(xyInteractiveScene).findIndex(
    ({ key }) => key === seriesKey
  );
  const datum = seriesData(seriesOf(xyInteractiveScene)[index]!, index)[mark]!;
  return [
    { x: datum.x, y: datum.y, mark: null, accessor: 'y1', datum },
    {
      specId: `series-0-0-${seriesKey}`,
      key: `series-0-0-${seriesKey}`,
      xAccessor: 'x',
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
      smVerticalValue: null,
      smHorizontalValue: null,
    });
    expect(events).toEqual([expected('Select an x category')]);
  });

  it('raises nothing for a projected x between positions when the axis states no interval', () => {
    const { events, env } = listen();
    xyHandlers(xyInteractiveScene, env).onProjectionClick?.({
      x: START + HOUR + 20 * 60_000,
      y: [],
      smVerticalValue: null,
      smHorizontalValue: null,
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
      xyHandlers(scene, env).onProjectionClick?.({
        x,
        y: [],
        smVerticalValue: null,
        smHorizontalValue: null,
      });
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

  describe('on an axis stating a two-hour interval, with data at 00:00, 01:00 and 03:00', () => {
    const { node } = xyChartExamples.find(
      ({ name }) => name === 'Interactive stacked bars'
    )!;
    // Four rows per hour: rows 4 to 7 are 01:00, and rows 8 to 11 move from 02:00 to 03:00.
    const scene = resolveChart(
      {
        ...node,
        data: {
          ...node.data,
          rows: node.data.rows.map(([time, ...cells], row) =>
            row >= 8 ? [START + 3 * HOUR, ...cells] : [time, ...cells]
          ),
        },
        axes: { x: { scale: 'temporal', interval: 2 * HOUR } },
      } as XyChartNode,
      { scheme: 'light' }
    );
    const click = (x: number) => {
      const { events, env } = listen();
      xyHandlers(scene, env).onProjectionClick?.({
        x,
        y: [],
        smVerticalValue: null,
        smHorizontalValue: null,
      });
      return events;
    };

    it('takes the hour between positions as the bucket, as Elastic Charts does', () => {
      expect(click(START + 2 * HOUR)).toEqual([]);
      expect(click(START + 4 * HOUR)).toEqual([]);
      expect(click(START + HOUR + 30 * 60_000)).toEqual([
        {
          kind: 'select',
          node: NODE,
          target: 'category',
          rows: [4, 5, 6, 7],
          columns: ['time'],
          values: { time: START + HOUR },
          description: '@timestamp per hour: 01:00',
        },
      ]);
    });
  });

  it('finds the bucket among 200,000 positions', () => {
    const { selection } = xyInteractiveScene.categories[1]!;
    // A position every two hours, each selecting its own row, on an hourly interval.
    const scene: XyScene = {
      ...xyInteractiveScene,
      axes: {
        ...xyInteractiveScene.axes,
        x: { ...xyInteractiveScene.axes.x, interval: HOUR },
      },
      categories: Array.from({ length: 200_000 }, (_, row) => ({
        x: START + row * 2 * HOUR,
        label: String(row),
        selection: { ...selection!, rows: [row] },
      })),
    };
    const rows = (x: number) => {
      const { events, env } = listen();
      xyHandlers(scene, env).onProjectionClick?.({
        x,
        y: [],
        smVerticalValue: null,
        smHorizontalValue: null,
      });
      return events.map((event) => event.kind === 'select' && event.rows);
    };
    expect(rows(START + 10 * HOUR)).toEqual([[5]]);
    expect(rows(START + 10 * HOUR + 30 * 60_000)).toEqual([[5]]);
    expect(rows(START + 11 * HOUR)).toEqual([]);
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
