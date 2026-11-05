/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLog } from 'd3-scale';
import { describe, expect, it } from 'vitest';

import { chartEventExamples } from '../schema/examples/events';
import { metricExamples } from '../schema/examples/metric';
import { xyChartExamples, xyInteractive } from '../schema/examples/xy_chart';
import type { MetricNode } from '../schema/metric';
import type { XyChartNode } from '../schema/xy_chart';

import { brushEvent, selectEvent } from './events';
import { xyInteractiveScene } from './examples';
import { resolveChart } from './resolve';
import {
  linearTicks,
  logTicks,
  niceDomain,
  niceLogDomain,
  timeTicks,
} from './ticks';
import type { MetricScene, Scene, XyScene } from './types';

const SIZE = { width: 480, height: 240 };

const metricNamed = (name: string): MetricNode =>
  metricExamples.find((example) => example.name === name)!.node;
const xyNamed = (name: string): XyChartNode =>
  xyChartExamples.find((example) => example.name === name)!.node;
const seriesIn = (scene: XyScene) =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );

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
        scene.kind === 'metric'
          ? scene.tiles.map(({ source }) => source)
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
  it('stacks split series per x in split order', () => {
    const scene: XyScene = resolveChart(
      xyNamed('Stacked bars with Other and missing buckets'),
      { scheme: 'light' }
    );
    const series = seriesIn(scene);
    const atFirstHour = series.map(({ key, marks }) => [
      key,
      marks[0]?.y0,
      marks[0]?.y,
    ]);
    expect(atFirstHour).toEqual([
      ['200', 0, 802],
      ['404', 802, 843],
      ['Other', 843, 855],
      ['\\null', 855, 858],
    ]);
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

  it('stacks percentages to one', () => {
    const scene = resolveChart(xyNamed('Percentage areas'), {
      scheme: 'light',
    });
    const tops = seriesIn(scene)
      .at(-1)!
      .marks.map(({ y }) => y);
    for (const top of tops) {
      expect(top).toBeCloseTo(1);
    }
    expect(scene.axes.y?.ticks.at(-1)?.label).toBe('100%');
  });

  it('puts each series on its own axis, formatted as its column', () => {
    const scene = resolveChart(xyNamed('Two y axes'), {
      scheme: 'light',
      size: SIZE,
    });
    expect(scene.axes.y?.position).toBe('left');
    expect(scene.axes.y2?.position).toBe('right');
    expect(scene.axes.y2?.ticks.every(({ label }) => label.endsWith('%'))).toBe(
      true
    );
  });

  it('turns the chart for horizontal bars', () => {
    const scene = resolveChart(xyNamed('Horizontal bars'), { scheme: 'light' });
    expect(scene.axes.x.position).toBe('left');
    expect(scene.axes.x.domain).toEqual(
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
    expect(scene.axes.y?.domain).toEqual([0, 1]);
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

// d3-array's `ticks` and `nice` give these for the same inputs.
describe('ticks', () => {
  it('steps by 1, 2 or 5 times a power of ten', () => {
    expect(linearTicks(0, 211, 5)).toEqual([0, 50, 100, 150, 200]);
    expect(linearTicks(0, 1, 10)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
    expect(linearTicks(-1.25e12, 9.9e11, 5)).toEqual([-1e12, -5e11, 0, 5e11]);
    expect(niceDomain(0, 211, 5)).toEqual([0, 250]);
  });

  // Elastic Charts draws a log axis with d3-scale 3.3.0's scaleLog, nice() then ticks(count).
  it.each([
    [39_800, 91_700, 5],
    [39_800, 91_700, 10],
    [1, 1e6, 5],
    [3, 7, 5],
    [0.002, 40, 4],
    [1, 1e20, 5],
  ])(
    'log ticks over [%s, %s] for %s ticks match d3-scale',
    (min, max, count) => {
      const d3 = scaleLog().domain([min, max]).nice();
      const [low, high] = d3.domain() as [number, number];
      expect(niceLogDomain(min, max)).toEqual([low, high]);
      expect(logTicks(low, high, count)).toEqual(d3.ticks(count));
      const raw = scaleLog().domain([min, max]);
      expect(logTicks(min, max, count)).toEqual(raw.ticks(count));
    }
  );

  it('gives the log axis in the long-labels example its ticks', () => {
    const scene = resolveChart(xyNamed('Long labels and legend statistics'), {
      scheme: 'light',
      size: SIZE,
    });
    const d3 = scaleLog().domain([39_800, 91_700]).nice();
    expect(scene.axes.y?.domain).toEqual(d3.domain());
    expect(scene.axes.y?.ticks.map(({ value }) => value)).toEqual(d3.ticks(5));
    expect(scene.axes.y?.ticks.length).toBeGreaterThan(0);
  });

  it('places time ticks on round wall-clock times', () => {
    const start = Date.UTC(2026, 10, 3, 0, 7);
    expect(timeTicks(start, start + 5 * 3_600_000, 5, 'Asia/Kolkata')).toEqual([
      Date.UTC(2026, 10, 3, 0, 30),
      Date.UTC(2026, 10, 3, 1, 30),
      Date.UTC(2026, 10, 3, 2, 30),
      Date.UTC(2026, 10, 3, 3, 30),
      Date.UTC(2026, 10, 3, 4, 30),
    ]);
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
