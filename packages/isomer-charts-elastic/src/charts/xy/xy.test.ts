/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  formatAxisValue,
  type SceneAxis,
  xyInteractiveScene,
  type XyScene,
  type XySceneLayer,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  chartEventExamples,
  xyChartExamples,
  type XyChartNode,
} from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  act,
  calls,
  debugState,
  debugStateIn,
  draw,
  mount,
  paints,
  resolvedCases,
  SIZE,
} from '../../shared/render.fixtures';

import { seriesOf } from './events';
import { sceneTooltip } from './xy';

/**
 * Each drawn label is the category's label, or the value through
 * `formatAxisValue`; a `twoRows` axis is Lens's two rows, which Elastic Charts
 * labels itself, so not every label is `formatAxisValue`'s.
 */
const expectLabelsFromScene = (
  drawn: { labels: string[]; values: unknown[] } | undefined,
  axis: SceneAxis,
  scene: XyScene
) => {
  expect(drawn).toBeDefined();
  const categories = new Map<unknown, string>(
    axis.scale === 'ordinal'
      ? scene.categories.map(({ x, label }) => [x, label])
      : []
  );
  const shown = drawn!.labels.map(
    (label, index) => [drawn!.values[index], label] as const
  );
  expect(shown.length).toBeGreaterThan(0);
  if (axis.twoRows) {
    expect(
      shown.some(
        ([value, label]) =>
          label !== formatAxisValue(scene, axis, value as number)
      )
    ).toBe(true);
    return;
  }
  for (const [value, label] of shown) {
    expect(label).toBe(
      categories.get(value) ?? formatAxisValue(scene, axis, value as number)
    );
  }
};

const horizontalScene: XyScene = {
  ...xyInteractiveScene,
  orientation: 'horizontal',
  scheme: 'dark',
  chrome: {
    text: '#DFE5EF',
    textSubdued: '#B2BDCE',
    axis: '#495A73',
    gridLine: '#2B394F',
    background: '#0B1628',
    border: '#495A73',
  },
  axes: {
    ...xyInteractiveScene.axes,
    x: { ...xyInteractiveScene.axes.x, position: 'left' },
    y: { ...xyInteractiveScene.axes.y!, position: 'bottom' },
  },
};

describe('elastic-charts renderer: xy', () => {
  it.each([
    { name: 'time series line', scene: xyTimeSeriesScene },
    { name: 'interactive stacked bars', scene: xyInteractiveScene },
    { name: 'horizontal bars in dark', scene: horizontalScene },
  ])('$name: axis labels are the Scene’s', async ({ scene }) => {
    const state = await debugState(scene);
    expectLabelsFromScene(state.axes?.x[0], scene.axes.x, scene);
    expectLabelsFromScene(state.axes?.y[0], scene.axes.y!, scene);
    expect(state.axes?.y[0]?.title).toBe(scene.axes.y?.title);
  });

  const byTheMinute = xyChartExamples.find(
    ({ name }) => name === 'Time axis by the minute'
  )!.node;
  const resolveXy = (node: XyChartNode) =>
    resolveChart(node, { scheme: 'light', size: SIZE });

  it.each(['linear', 'log'] as const)(
    'draws a custom %s y domain’s stated bounds exactly, and the end it leaves out from the data',
    async (scale) => {
      // A line of 98 to 210.
      const line = xyChartExamples.find(
        ({ name }) => name === 'Time series line'
      )!.node;
      const toScale = (value: number) =>
        scale === 'log' ? Math.log10(value) : value;
      const fromScale = (value: number) =>
        scale === 'log' ? 10 ** value : value;
      // The y scale read back from where the line's lowest and highest points are drawn.
      const scaleOf = async (domain: { min?: number; max?: number }) => {
        const node: XyChartNode = {
          ...line,
          axes: {
            ...line.axes,
            y: { scale, domain: { kind: 'custom', ...domain } },
          },
        };
        const { path, points } = (await debugState(resolveXy(node))).lines![0]!;
        const drawn = [...path.matchAll(/[ML][^,]+,([-\d.e]+)/g)].map(([, y]) =>
          Number(y)
        );
        expect(drawn).toHaveLength(points.length);
        const placed = points
          .map(({ y }, index) => [toScale(Number(y)), drawn[index]!] as const)
          .sort(([a], [b]) => a - b);
        const [[v1, p1], [v2, p2]] = [placed[0]!, placed.at(-1)!];
        const perPixel = (v2 - v1) / (p2 - p1);
        return {
          valueAt: (pixel: number) => fromScale(v1 + (pixel - p1) * perPixel),
          pixelOf: (value: number) => p1 + (toScale(value) - v1) / perPixel,
        };
      };
      const both = await scaleOf({ min: 57, max: 987 });
      expect(both.pixelOf(987)).toBeCloseTo(0, 1);
      const bottom = both.pixelOf(57);
      expect(bottom).toBeGreaterThan(0);

      const toMax = await scaleOf({ max: 987 });
      expect(toMax.valueAt(0)).toBeCloseTo(987, 1);
      expect(toMax.valueAt(bottom)).toBeCloseTo(scale === 'log' ? 98 : 0, 1);
      const fromMin = await scaleOf({ min: 57 });
      expect(fromMin.valueAt(bottom)).toBeCloseTo(57, 1);
      expect(fromMin.valueAt(0)).toBeCloseTo(210, 1);
    }
  );

  it('draws a time axis’s minor and major rows, as Lens does', async () => {
    const { labels } = (await debugState(resolveXy(byTheMinute))).axes!.x[0]!;
    expect(labels).toEqual(
      expect.arrayContaining([
        '23:15',
        '00:00',
        'November 3, 2026',
        'November 4, 2026',
      ])
    );
  });

  it.each([
    [
      'one x value and no interval',
      {
        ...byTheMinute,
        axes: { x: { scale: 'temporal', labelOrientation: 'angled' } },
        data: { ...byTheMinute.data, rows: byTheMinute.data.rows.slice(0, 1) },
      },
    ],
    [
      'six centuries',
      {
        ...byTheMinute,
        axes: { x: { scale: 'temporal', labelOrientation: 'angled' } },
        data: {
          ...byTheMinute.data,
          rows: [Date.UTC(1426, 0), Date.UTC(1427, 0), Date.UTC(2026, 0)].map(
            (at) => [at, 1]
          ),
        },
      },
    ],
  ] as const)(
    'labels one row through `formatAxisValue` for %s',
    async (_, node) => {
      const scene = resolveXy(node);
      expect(scene.axes.x.twoRows).toBeUndefined();
      expect(scene.axes.x.labelRotation).toBe(-45);
      expectLabelsFromScene(
        (await debugState(scene)).axes?.x[0],
        scene.axes.x,
        scene
      );
    }
  );

  it('draws legend items in the Scene’s order, names and colors', async () => {
    const state = await debugState(xyInteractiveScene);
    expect(
      state.legend?.items.map(({ name, color }) => ({ name, color }))
    ).toEqual(
      xyInteractiveScene.legend.items.map(({ label, color }) => ({
        name: label,
        color,
      }))
    );
  });

  it('hands Elastic Charts each bar’s unstacked value, in draw order', async () => {
    const state = await debugState(xyInteractiveScene);
    expect(
      state.bars?.map(({ name, color, bars }) => ({
        name,
        color,
        heights: bars.map(({ x, y }): unknown[] => [x, y]),
      }))
    ).toEqual(
      seriesOf(xyInteractiveScene).map(({ label, color, marks }) => ({
        name: label,
        color,
        heights: marks.map(({ x, y }) => [x, y ?? 0]),
      }))
    );
  });

  it('draws line points where the Scene places its marks', async () => {
    const state = await debugState(xyTimeSeriesScene);
    const [series] = seriesOf(xyTimeSeriesScene);
    expect(state.lines?.map(({ name, color }) => ({ name, color }))).toEqual([
      { name: series!.label, color: series!.color },
    ]);
    expect(
      state.lines?.[0]?.points.map(({ x, y }): unknown[] => [x, y])
    ).toEqual(series!.marks.map(({ x, y }) => [x, y]));
  });

  it('draws on the Scene’s background', async () => {
    const container = await draw(horizontalScene);
    const background = container.querySelector<HTMLElement>(
      '.echChartBackground'
    );
    expect(background?.style.backgroundColor).toBe('rgb(11, 22, 40)');
  });
});

describe('elastic-charts renderer: xy layer order', () => {
  const LINE = '#ff0000';
  const RANGE = '#00ff00';
  const rgba = (hex: string) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, 1)`;
  const reference: XySceneLayer = {
    kind: 'referenceLine',
    line: {
      axis: 'y',
      value: 100,
      color: LINE,
      strokeWidth: 1,
      strokeDash: 'solid',
      textPosition: 'auto',
    },
  };
  const range: XySceneLayer = {
    kind: 'annotation',
    annotation: {
      kind: 'range',
      fill: 'inside',
      from: xyInteractiveScene.categories[0]!.x as number,
      to: xyInteractiveScene.categories[1]!.x as number,
      color: RANGE,
      tooltip: { entries: [] },
    },
  };
  const series = xyInteractiveScene.layers.filter(
    ({ kind }) => kind === 'series'
  );
  const bar = seriesOf(xyInteractiveScene)[0]!.color;

  /** Where Elastic Charts first paints each color. */
  const paintOrder = async (layers: XyScene['layers']) => {
    paints.length = 0;
    await draw({ ...xyInteractiveScene, layers });
    const first = (hex: string) => {
      const at = paints.findIndex(
        (paint) =>
          paint.toLowerCase() === hex.toLowerCase() ||
          paint.replace(/\s/g, '') === rgba(hex).replace(/\s/g, '')
      );
      expect(at, `${hex} painted`).toBeGreaterThanOrEqual(0);
      return at;
    };
    return { line: first(LINE), range: first(RANGE), bar: first(bar) };
  };

  it('paints helper layers before the first series beneath the series', async () => {
    const order = await paintOrder([reference, range, ...series]);
    expect(order.line).toBeLessThan(order.bar);
    expect(order.range).toBeLessThan(order.bar);
  });

  it('paints a reference line after a series above it, and a range beneath it as Kibana does', async () => {
    const order = await paintOrder([...series, range, reference]);
    expect(order.range).toBeLessThan(order.bar);
    expect(order.bar).toBeLessThan(order.line);
  });
});

describe('elastic-charts renderer: bar value labels', () => {
  const [series] = seriesOf(xyInteractiveScene);
  // The last bar is shorter than its label.
  const values = [900, 600, 40];
  const fitting = ['v900', 'v600'];
  const scene = (orientation: XyScene['orientation']): XyScene => ({
    ...(orientation === 'horizontal' ? horizontalScene : xyInteractiveScene),
    layers: [
      {
        kind: 'series',
        series: {
          ...series!,
          valueLabels: true,
          marks: values.map((y, index) => ({
            ...series!.marks[index]!,
            y,
            label: `v${y}`,
          })),
        },
      },
    ],
  });

  /**
   * Each bar's rectangle and each drawn label's origin and scale, in the panel's
   * rotated space, where `y` grows toward the baseline in either orientation.
   */
  const drawn = async (orientation: XyScene['orientation']) => {
    calls.length = 0;
    await draw(scene(orientation));
    const clip = calls.findIndex(
      ([name, [x, y]]) => name === 'rect' && x === -0.5 && y === -0.5
    );
    const bars = calls
      .slice(clip + 1)
      .filter(([name]) => name === 'rect')
      .slice(0, values.length)
      .map(([, args]) => {
        const [x, y, width, height] = args as number[];
        return { x: x!, y: y!, width: width!, height: height! };
      });
    // Elastic Charts' `renderText`: translate to the origin, rotate, translate, scale, fill.
    const labels = calls.flatMap(([name, [text]], index) => {
      if (name !== 'fillText' || !/^v\d+$/.test(String(text))) {
        return [];
      }
      const [x, y] = calls[index - 4]![1] as number[];
      const [scale] = calls[index - 1]![1] as number[];
      return [{ text: String(text), x: x!, y: y!, scale: scale! }];
    });
    return { bars, labels };
  };

  // Kibana's `getValueLabelsStyling` (`expression_xy/public/components/xy_chart.tsx`):
  // 10 to 12 px text, offset 10 px along the bar, over the base theme's centered alignment.
  it.each(['vertical', 'horizontal'] as const)(
    'draws each fitting label 10 px toward the baseline from the middle of its bar on a %s chart',
    async (orientation) => {
      const { bars, labels } = await drawn(orientation);
      expect(labels.map(({ text }) => text)).toEqual(fitting);
      labels.forEach(({ text, x, y, scale }, index) => {
        const bar = bars[index]!;
        expect(scale).toBeCloseTo(12 / 10);
        const textHeight = 10 * scale;
        // The canvas stub measures 6 px a character; Elastic Charts pads a label's width by 1.
        const textWidth = text.length * 6 + 1;
        const [across, along] =
          orientation === 'vertical'
            ? [x, y + textHeight / 2]
            : [x + textHeight / 2, y + textWidth / 2];
        expect(across).toBeCloseTo(bar.x + bar.width / 2);
        expect(along).toBeCloseTo(bar.y + bar.height / 2 + 10);
      });
    }
  );

  // Kibana's `overflowConstraints` (`expression_xy/public/components/data_layers.tsx`).
  it.each(['vertical', 'horizontal'] as const)(
    'draws no label that overflows its bar on a %s chart',
    async (orientation) => {
      const { bars, labels } = await drawn(orientation);
      expect(bars[2]!.height).toBeGreaterThan(0);
      // A label is 10 px tall at its smallest, and the canvas stub measures `v40` 18 px wide.
      expect(bars[2]!.height).toBeLessThan(
        orientation === 'vertical' ? 10 : 18
      );
      expect(labels.map(({ text }) => text)).not.toContain('v40');
    }
  );
});

describe('elastic-charts renderer: xy legend actions', () => {
  const filterOut = chartEventExamples.find(
    ({ name }) => name === 'Filter out a legend item'
  )!.event;
  const { negate: _negate, ...filterFor } = filterOut as ChartEvent & {
    negate?: boolean;
  };

  it.each([
    { action: 'Filter for Other', event: filterFor },
    { action: 'Filter out Other', event: filterOut },
  ])('$action raises the legend item’s event', async ({ action, event }) => {
    const events: ChartEvent[] = [];
    const container = await draw(xyInteractiveScene, {
      environment: 'browser',
      nodeId: filterOut.node,
      onEvent: (raised) => events.push(raised),
    });
    const button = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${action}"]`
    );
    expect(button).not.toBeNull();
    act(() => button!.click());
    expect(events).toEqual([event]);
  });

  it('offers no legend actions without onEvent', async () => {
    const container = await draw(xyInteractiveScene);
    expect(container.querySelector('button[aria-label^="Filter "]')).toBeNull();
  });
});

describe('elastic-charts renderer: a series hidden from the legend', () => {
  /** The series Elastic Charts draws; it leaves a hidden one out. */
  const drawn = (container: HTMLElement) =>
    (debugStateIn(container).bars ?? []).map(({ name }) => name);

  it('stays hidden, alone, when new data puts a series ahead of it', async () => {
    const [first] = seriesOf(xyInteractiveScene);
    const {
      key: _key,
      selection: _selection,
      ...item
    } = xyInteractiveScene.legend.items[0]!;
    const refreshed: XyScene = {
      ...xyInteractiveScene,
      layers: [
        { kind: 'series', series: { ...first!, key: 'new', label: 'New' } },
        ...xyInteractiveScene.layers,
      ],
      legend: {
        ...xyInteractiveScene.legend,
        items: [
          { ...item, key: 'new', label: 'New' },
          ...xyInteractiveScene.legend.items,
        ],
      },
    };
    const { container, redraw } = await mount(xyInteractiveScene);
    expect(drawn(container)).toEqual(['200', '404', 'Other', '(null)']);
    const label = [
      ...container.querySelectorAll<HTMLElement>('.echLegendItem__label'),
    ].find(({ textContent }) => textContent === '404');
    expect(label).toBeDefined();
    // Elastic Charts hides one series on a meta- or ctrl-click, by platform; a plain click isolates it.
    act(() => {
      label!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, metaKey: true, ctrlKey: true })
      );
    });
    expect(drawn(container)).toEqual(['200', 'Other', '(null)']);
    await redraw(refreshed);
    expect(drawn(container)).toEqual(['New', '200', 'Other', '(null)']);
  });
});

describe('elastic-charts renderer: xy tooltip', () => {
  const tooltip = (scene: XyScene, marks: readonly [number, number][]) => {
    const series = seriesOf(scene);
    const values = marks.map(([index, mark]) => ({
      datum: { ...series[index]!.marks[mark]!, series: index, mark },
    }));
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(sceneTooltip(scene), { values } as never)
    );
    return {
      header: page.querySelector('.echTooltipHeader')?.textContent,
      rows: [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((cell) => cell.textContent)
      ),
      colors: [...page.querySelectorAll('.echTooltip__colorStrip[style]')].map(
        (strip) => strip.getAttribute('style')
      ),
    };
  };

  it('heads with the hovered category’s Scene label, then lists each series’ name and mark label', () => {
    const [first, second] = seriesOf(xyInteractiveScene);
    const { header, rows } = tooltip(xyInteractiveScene, [
      [0, 1],
      [1, 1],
    ]);
    const category = xyInteractiveScene.categories.find(
      ({ x }) => x === first!.marks[1]!.x
    );
    expect(header).toBe(category!.label);
    expect(rows).toEqual([
      [first!.label, first!.marks[1]!.label],
      [second!.label, second!.marks[1]!.label],
    ]);
  });

  it('keeps a category’s authored label on a continuous axis', () => {
    const scene: XyScene = {
      ...xyTimeSeriesScene,
      categories: xyTimeSeriesScene.categories.map((category) => ({
        ...category,
        label: `bucket ${category.label}`,
      })),
    };
    expect(tooltip(scene, [[0, 0]]).header).toBe(scene.categories[0]!.label);
  });

  it('colors each row with its series’ color', () => {
    const { colors } = tooltip(xyInteractiveScene, [[0, 1]]);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toContain(seriesOf(xyInteractiveScene)[0]!.color);
  });
});

describe('elastic-charts renderer: resolved xyChart examples', () => {
  it.each(resolvedCases(xyChartExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'xy') {
      throw new Error('expected an xy Scene');
    }
    if (scene.empty) {
      const container = await draw(scene);
      expect(container.textContent).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    const state = await debugState(scene);
    for (const drawn of state.axes?.x ?? []) {
      expectLabelsFromScene(drawn, scene.axes.x, scene);
    }
    for (const drawn of state.axes?.y ?? []) {
      const axis = scene.axes[drawn.id as 'y' | 'y2'];
      expect(axis).toBeDefined();
      expectLabelsFromScene(drawn, axis!, scene);
    }
    const series = seriesOf(scene).map(({ label, color }) => ({
      name: label,
      color,
    }));
    const drawn = [
      ...(state.bars ?? []),
      ...(state.lines ?? []),
      ...(state.areas ?? []),
    ].map(({ name, color }) => ({ name, color }));
    expect(drawn).toHaveLength(series.length);
    expect(drawn).toEqual(expect.arrayContaining(series));
    if (scene.legend.visible) {
      expect(
        state.legend?.items.map(({ name, color }) => ({ name, color }))
      ).toEqual(
        scene.legend.items.map(({ label, color }) => ({ name: label, color }))
      );
    }
  });
});
