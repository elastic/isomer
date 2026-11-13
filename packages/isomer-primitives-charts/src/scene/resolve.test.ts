/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { dataTableExamples } from '../schema/examples/data_table';
import { chartEventExamples } from '../schema/examples/events';
import { gaugeExamples } from '../schema/examples/gauge';
import { heatmapExamples } from '../schema/examples/heatmap';
import { legacyMetricExamples } from '../schema/examples/legacy_metric';
import { metricExamples } from '../schema/examples/metric';
import { partitionChartExamples } from '../schema/examples/partition_chart';
import { tagCloudExamples } from '../schema/examples/tag_cloud';
import { xyChartExamples, xyInteractive } from '../schema/examples/xy_chart';
import type { MetricNode } from '../schema/metric';
import type { XyChartNode } from '../schema/xy_chart';

import { brushEvent, selectEvent } from './events';
import { xyInteractiveScene } from './examples';
import { formatAxisValue } from './format_axis';
import { resolveChart } from './resolve';
import type { MetricScene, PartitionNode, Scene, XyScene } from './types';

const SIZE = { width: 480, height: 240 };

const metricNamed = (name: string): MetricNode =>
  metricExamples.find((example) => example.name === name)!.node;
const xyNamed = (name: string): XyChartNode =>
  xyChartExamples.find((example) => example.name === name)!.node;
const seriesIn = (scene: XyScene) =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );

const slicesIn = (nodes: readonly PartitionNode[]): PartitionNode[] =>
  nodes.flatMap((node) => [node, ...slicesIn(node.children)]);

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const nodes = [
  ...metricExamples.map(({ name, node }) => ({
    name: `metric: ${name}`,
    node,
  })),
  ...xyChartExamples.map(({ name, node }) => ({
    name: `xyChart: ${name}`,
    node,
  })),
  ...dataTableExamples.map(({ name, node }) => ({
    name: `dataTable: ${name}`,
    node,
  })),
  ...gaugeExamples.map(({ name, node }) => ({
    name: `gauge: ${name}`,
    node,
  })),
  ...legacyMetricExamples.map(({ name, node }) => ({
    name: `legacyMetric: ${name}`,
    node,
  })),
  ...tagCloudExamples.map(({ name, node }) => ({
    name: `tagCloud: ${name}`,
    node,
  })),
  ...heatmapExamples.map(({ name, node }) => ({
    name: `heatmap: ${name}`,
    node,
  })),
  ...partitionChartExamples.map(({ name, node }) => ({
    name: `partitionChart: ${name}`,
    node,
  })),
];

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

const colorsIn = (value: unknown, key = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => colorsIn(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([name, item]) =>
      colorsIn(item, name)
    );
  }
  return /color|background|track|text$|textSubdued|axis|gridLine|border/i.test(
    key
  ) &&
    typeof value === 'string' &&
    value.startsWith('#')
    ? [value]
    : [];
};

describe('resolveChart on every example', () => {
  it.each(nodes)(
    '$name resolves in both schemes to plain, concrete data',
    ({ node }) => {
      for (const scheme of ['light', 'dark'] as const) {
        const scene: Scene = resolveChart(
          deepFreeze(structuredClone(node)) as MetricNode,
          {
            scheme,
            size: SIZE,
          }
        );
        expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
        expect(scene.scheme).toBe(scheme);
        for (const color of colorsIn(scene)) {
          expect(color).toMatch(HEX);
        }
        expect(
          resolveChart(node as MetricNode, { scheme, size: SIZE })
        ).toEqual(scene);
      }
    }
  );

  it.each(nodes)(
    '$name: every source names rows and columns of its data',
    ({ node }) => {
      const scene = resolveChart(node as MetricNode, {
        scheme: 'light',
      }) as Scene;
      const ids = new Set(node.data.columns.map(({ id }) => id));
      const sources =
        scene.kind === 'metric' || scene.kind === 'legacyMetric'
          ? scene.tiles.map(({ source }) => source)
          : scene.kind === 'table'
            ? scene.rows.flatMap(({ cells }) =>
                cells.map(({ source }) => source)
              )
            : scene.kind === 'partition'
              ? slicesIn(scene.nodes).map(({ source }) => source)
              : scene.kind === 'heatmap'
                ? scene.cells.map(({ source }) => source)
                : scene.kind === 'gauge'
                  ? []
                  : scene.kind === 'tagCloud'
                    ? scene.words.map(({ source }) => source)
                    : seriesIn(scene).flatMap((series) => [
                        series.source,
                        ...series.marks.map(({ source }) => source),
                      ]);
      for (const { rows, columns } of sources) {
        for (const row of rows) {
          expect(row).toBeLessThan(node.data.rows.length);
        }
        for (const column of columns) {
          expect(ids.has(column)).toBe(true);
        }
      }
    }
  );
});

describe('interaction parity with the C4 events', () => {
  const scene = resolveChart(xyInteractive, { scheme: 'light', size: SIZE });
  const node = xyInteractive.id!;
  const byName = (name: string) =>
    chartEventExamples.find((example) => example.name === name)!.event;
  const markAt = (row: number) =>
    seriesIn(scene)
      .flatMap(({ marks }) => marks)
      .find(({ source }) => source.rows[0] === row)!;

  it('raises the bar segment and missing-bucket events from marks', () => {
    expect(selectEvent(node, markAt(1).selection!)).toEqual(
      byName('Select a bar segment')
    );
    expect(selectEvent(node, markAt(3).selection!)).toEqual(
      byName('Select the missing bucket')
    );
  });

  it('raises the filtered-out legend event from a legend item', () => {
    const other = scene.legend.items.find(({ label }) => label === 'Other')!;
    expect(selectEvent(node, other.selection!, true)).toEqual(
      byName('Filter out a legend item')
    );
  });

  it('raises the category event from a category', () => {
    const category = scene.categories[1]!;
    expect(selectEvent(node, category.selection!)).toEqual(
      byName('Select an x category')
    );
  });

  it('raises the brush event', () => {
    const expected = byName('Brush a time range');
    expect(
      brushEvent(
        scene,
        node,
        expected.kind === 'brush' ? expected.range : [0, 0]
      )
    ).toEqual(expected);
  });

  it('agrees with the hand-written interactive Scene on what each part selects', () => {
    expect(scene.categories).toEqual(xyInteractiveScene.categories);
    expect(
      seriesIn(scene).map(({ key, selection }) => ({ key, selection }))
    ).toEqual(
      seriesIn(xyInteractiveScene).map(({ key, selection }) => ({
        key,
        selection,
      }))
    );
    expect(
      scene.legend.items.map(({ key, hidden }) => ({ key, hidden }))
    ).toEqual(
      xyInteractiveScene.legend.items.map(({ key, hidden }) => ({
        key,
        hidden,
      }))
    );
  });

  it('offers nothing a node does not', () => {
    const plain = resolveChart(xyNamed('Time series line'), {
      scheme: 'light',
    });
    expect(plain.interactions.select).toEqual([]);
    expect(
      seriesIn(plain)[0]?.marks.every(
        ({ selection }) => selection === undefined
      )
    ).toBe(true);
  });
});

describe('metric', () => {
  const tileOf = (scene: MetricScene, title: string) =>
    scene.tiles.find((tile) => tile.title === title)!;

  // Comparing to the primary shows primary − secondary with a sign, colored by
  // its direction.
  it('compares a secondary value to the primary with a signed difference', () => {
    const scene = resolveChart(metricNamed('Compared to the primary value'), {
      scheme: 'light',
    });
    expect(scene.tiles[0]?.secondary).toEqual({
      label: 'Last week',
      labelPlacement: 'before',
      text: '-1.3%',
      color: scene.chrome.textSubdued,
      badge: {
        direction: 'decrease',
        color: '#54B399',
        showIcon: true,
        icon: '↓',
      },
    });
  });

  it('colors each tile by its share of its own maximum', () => {
    const scene = resolveChart(
      metricNamed('Breakdown with Other and missing buckets'),
      {
        scheme: 'light',
      }
    );
    expect(tileOf(scene, 'web-01').background).toBe('#E7664C'); // 82.4%
    expect(tileOf(scene, 'web-02').background).toBe('#54B399'); // 19.6%
    expect(tileOf(scene, 'Other').background).toBe('#54B399'); // 31.25%
    expect(tileOf(scene, '(null)').background).toBe('#54B399');
    expect(tileOf(scene, 'web-01').progress?.fraction).toBeCloseTo(0.824);
    expect(scene.layout).toMatchObject({ columns: 2, rows: 2 });
  });

  it('shows a pre-rendered display string', () => {
    const scene = resolveChart(
      metricNamed('Pre-rendered value with provenance'),
      {
        scheme: 'dark',
      }
    );
    expect(scene.tiles[0]?.value.text).toBe('223.87.60.27 (cn)');
  });

  it('flags an all-empty column', () => {
    const scene = resolveChart(metricNamed('Missing value'), {
      scheme: 'light',
    });
    expect(scene.table.columns[0]?.empty).toBe(true);
    expect(scene.table.rows[0]?.cells).toEqual(['(null)']);
  });

  it('defaults to three tiles per row', () => {
    const node = metricNamed('Huge, tiny and negative values');
    const scene = resolveChart(
      { ...node, breakdown: { column: 'case' } },
      { scheme: 'light' }
    );
    expect(scene.layout).toMatchObject({ columns: 3, rows: 2 });
  });
});

describe('xyChart', () => {
  it('orders split series in split order, unstacked, in one stack group', () => {
    const scene: XyScene = resolveChart(
      xyNamed('Stacked bars with Other and missing buckets'),
      { scheme: 'light' }
    );
    const series = seriesIn(scene);
    const atFirstHour = series.map(({ key, marks }) => [key, marks[0]?.y]);
    expect(atFirstHour).toEqual([
      ['200', 802],
      ['404', 41],
      ['Other', 12],
      ['\\null', 3],
    ]);
    expect(new Set(series.map(({ stack }) => JSON.stringify(stack))).size).toBe(
      1
    );
    expect(series[0]?.stack?.mode).toBe('stacked');
    expect(series.map(({ color }) => color)).toEqual([
      '#16C5C0',
      '#61A2FF',
      '#BFDBFF',
      '#EE72A6',
    ]);
  });

  it('keeps a missing split cell, the string "null" and a colon in separate series keys', () => {
    const node: XyChartNode = {
      type: 'xyChart',
      data: {
        columns: [
          { id: 'x', label: 'x', type: 'number', role: 'dimension' },
          { id: 's', label: 's', type: 'string', role: 'dimension' },
          { id: 'y', label: 'y', type: 'number', role: 'metric' },
        ],
        rows: [
          [1, null, 1],
          [1, 'null', 2],
          [1, 'a:b', 3],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'bar',
          x: 'x',
          y: [{ column: 'y' }],
          splitBy: 's',
        },
      ],
    };
    const scene: XyScene = resolveChart(node, { scheme: 'light' });
    expect(seriesIn(scene).map(({ key }) => key)).toEqual([
      '\\null',
      'null',
      'a\\:b',
    ]);
  });

  it('formats a percentage stack axis as percent, from zero', () => {
    const scene = resolveChart(xyNamed('Percentage areas'), {
      scheme: 'light',
    });
    expect(seriesIn(scene)[0]?.stack?.mode).toBe('percentage');
    const axis = scene.axes.y!;
    expect(axis.domain).toMatchObject({ kind: 'data', includeZero: true });
    expect(formatAxisValue(scene, axis, 1)).toBe('100%');
  });

  it('puts each series on its own axis, formatted as its column', () => {
    const scene = resolveChart(xyNamed('Two y axes'), {
      scheme: 'light',
      size: SIZE,
    });
    expect(scene.axes.y?.position).toBe('left');
    expect(scene.axes.y2?.position).toBe('right');
    expect(formatAxisValue(scene, scene.axes.y2!, 0.25)).toBe('25%');
  });

  it('turns the chart for horizontal bars', () => {
    const scene = resolveChart(xyNamed('Horizontal bars'), { scheme: 'light' });
    expect(scene.axes.x.position).toBe('left');
    expect(scene.axes.x.domain).toBeUndefined();
    expect(scene.categories.map(({ x }) => x)).toEqual(
      ['CN', 'IN', 'US', 'ID', 'BR'].map((value) => JSON.stringify(value))
    );
  });

  it('keeps reference lines and annotations as helper marks', () => {
    const scene = resolveChart(xyNamed('Reference lines and annotations'), {
      scheme: 'light',
    });
    expect(
      scene.layers.flatMap((layer) =>
        layer.kind === 'referenceLine' ? [layer.line] : []
      )
    ).toEqual([
      expect.objectContaining({
        value: 0.8,
        label: 'SLO',
        color: '#E7664C',
        fill: 'above',
      }),
    ]);
    expect(scene.layers.map(({ kind }) => kind)).toEqual([
      'series',
      'referenceLine',
      'annotation',
      'annotation',
    ]);
    expect(
      scene.layers.flatMap((layer) =>
        layer.kind === 'annotation' ? [layer.annotation.kind] : []
      )
    ).toEqual(['point', 'range']);
    expect(scene.axes.y?.domain).toEqual({ kind: 'custom', min: 0, max: 1 });
  });

  it('reads each layer’s own rows', () => {
    const scene = resolveChart(xyNamed('Layers from two tables'), {
      scheme: 'light',
    });
    expect(seriesIn(scene).map(({ source }) => source.rows)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  it('formats legend statistics with the series format', () => {
    const scene = resolveChart(xyNamed('Long labels and legend statistics'), {
      scheme: 'light',
    });
    expect(scene.legend.items[0]?.statistics).toEqual([
      { name: 'Average', value: '40.5 ms' },
      { name: 'Last value', value: '39.8 ms' },
    ]);
  });
});

describe('axes', () => {
  it('states a log axis as intent, leaving its ticks to the engine', () => {
    const scene = resolveChart(xyNamed('Long labels and legend statistics'), {
      scheme: 'light',
      size: SIZE,
    });
    expect(scene.axes.y).toMatchObject({
      scale: 'log',
      domain: { kind: 'data', includeZero: false, rounding: true },
    });
  });

  it('labels an engine tick in the time axis zone', () => {
    const node: XyChartNode = {
      type: 'xyChart',
      data: {
        columns: [
          {
            id: 't',
            label: 'T',
            type: 'date',
            role: 'dimension',
            format: {
              kind: 'date',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            },
          },
          { id: 'v', label: 'V', type: 'number', role: 'metric' },
        ],
        rows: [[Date.UTC(2026, 10, 3, 0, 7), 1]],
      },
      layers: [{ kind: 'data', mark: 'line', x: 't', y: [{ column: 'v' }] }],
    };
    const scene = resolveChart(node, {
      scheme: 'light',
      timeZone: 'Asia/Kolkata',
    });
    expect(scene.axes.x.timeZone).toBe('Asia/Kolkata');
    expect(
      formatAxisValue(scene, scene.axes.x, Date.UTC(2026, 10, 3, 0, 30))
    ).toBe('06:00');
  });
});

describe('formatting options', () => {
  it('formats in the requested locale', () => {
    const node: MetricNode = {
      type: 'metric',
      data: {
        columns: [{ id: 'v', label: 'V', type: 'number', role: 'metric' }],
        rows: [[1234.5]],
      },
      value: { column: 'v' },
    };
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.value.text).toBe(
      '1,234.5'
    );
    const de = resolveChart(node, { scheme: 'light', locale: 'de' });
    expect(de.locale).toBe('de');
    expect(de.tiles[0]?.value.text).toBe('1.234,5');
  });

  it('prints a missing value as (null), not zero', () => {
    const scene = resolveChart(metricNamed('Missing value'), {
      scheme: 'light',
    });
    expect(scene.table.rows[0]?.cells).toEqual(['(null)']);
  });

  it('prints missing values with the node’s data.missing text', () => {
    const node = metricNamed('Missing value');
    const scene = resolveChart(
      { ...node, data: { ...node.data, missing: { null: 'n/a' } } },
      { scheme: 'light' }
    );
    expect(scene.table.rows[0]?.cells).toEqual(['n/a']);
    expect(scene.tiles[0]?.value.text).toBe('n/a');
  });
});

describe('a Scene’s table rows', () => {
  // A metric reads only its value column, so the `note` column's display
  // strings are read by nothing but the table.
  const counted = () => {
    let reads = 0;
    const display = new Proxy(['first', 'second'], {
      get: (strings, key, receiver) => {
        if (key === '0' || key === '1') {
          reads += 1;
        }
        return Reflect.get(strings, key, receiver) as unknown;
      },
    });
    const node: MetricNode = {
      type: 'metric',
      data: {
        columns: [
          { id: 'host', label: 'Host', type: 'string', role: 'dimension' },
          { id: 'value', label: 'Value', type: 'number', role: 'metric' },
          { id: 'note', label: 'Note', type: 'string', role: 'dimension' },
        ],
        rows: [
          ['a', 1, 'x'],
          ['b', 2, 'y'],
        ],
        display: { note: display },
      },
      value: { column: 'value' },
      breakdown: { column: 'host' },
    };
    return {
      scene: resolveChart(node, { scheme: 'light' }),
      reads: () => reads,
    };
  };

  it('are not formatted until they are read', () => {
    const { scene, reads } = counted();
    expect(reads()).toBe(0);
    expect(scene.table.rows.map(({ cells }) => cells[2])).toEqual([
      'first',
      'second',
    ]);
    expect(reads()).toBe(2);
  });

  it('are formatted once, and serialize with the Scene', () => {
    const { scene, reads } = counted();
    const { rows } = scene.table;
    expect(scene.table.rows).toBe(rows);
    expect((JSON.parse(JSON.stringify(scene)) as Scene).table.rows).toEqual(
      rows
    );
    expect(reads()).toBe(2);
  });
});
