/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// Draws each example Scene with Elastic Charts and reads back what it drew,
// through the `DebugState` Kibana's functional tests read (and the page, for
// the metric chart, which reports none). Every string and color must be the
// Scene's: that is Gate B's content criterion for this renderer.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act as testUtilsAct } from 'react-dom/test-utils';
import type { DebugState } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  formatAxisValue,
  metricSingleValueScene,
  type Scene,
  type SceneAxis,
  type SceneRenderEnv,
  xyInteractiveScene,
  type XyScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  chartEventExamples,
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { seriesOf } from './events';
import { createElasticChartsRenderer } from './renderer';
import { sceneTooltip } from './xy';

// React 18.3 exports `act` from `react`; earlier 18.x only from `react-dom/test-utils`.
const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

// jsdom has no layout and no canvas: Elastic Charts learns its size from
// ResizeObserver and measures text through a 2D context.
class FixedResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const chart = target.closest<HTMLElement>('.echChart');
    const width = parseFloat(chart?.style.width ?? '') || 480;
    const height = parseFloat(chart?.style.height ?? '') || 240;
    this.callback(
      [
        {
          target,
          contentRect: { width, height, top: 0, left: 0 },
        } as unknown as ResizeObserverEntry,
      ],
      this
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FixedResizeObserver;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const context = new Proxy(
  {},
  {
    get: (_, key) =>
      key === 'measureText'
        ? (text: string) => ({
            width: text.length * 6,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            fontBoundingBoxAscent: 9,
            fontBoundingBoxDescent: 3,
          })
        : key === 'getLineDash'
          ? () => []
          : typeof key === 'string' && key.startsWith('create')
            ? () => ({ addColorStop: () => undefined })
            : () => undefined,
    set: () => true,
  }
);
HTMLCanvasElement.prototype.getContext = (() => context) as never;
globalThis.Path2D = class {
  addPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  rect() {}
  arc() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
} as never;

const renderer = createElasticChartsRenderer({ debugState: true });
const roots: (() => void)[] = [];

afterEach(() => {
  roots.splice(0).forEach((unmount) => unmount());
});

const draw = async (
  scene: Scene,
  env: SceneRenderEnv = { environment: 'browser' }
): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(renderer.render(scene, env) as never);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  roots.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
};

const debugState = async (scene: XyScene): Promise<DebugState> => {
  const container = await draw(scene);
  const status = container.querySelector('[data-ech-debug-state]');
  const raw = status?.getAttribute('data-ech-debug-state');
  if (!raw) {
    throw new Error('Elastic Charts wrote no DebugState');
  }
  return JSON.parse(raw) as DebugState;
};

/** Each drawn label is the category's label, or the value through `formatAxisValue`. */
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

describe('elastic-charts renderer: metric', () => {
  it('prints the Scene’s title and value', async () => {
    const container = await draw(metricSingleValueScene);
    const [tile] = metricSingleValueScene.tiles;
    expect(container.textContent).toContain(tile!.title);
    expect(container.textContent).toContain(tile!.value.text);
  });
});

const SIZE = { width: 480, height: 240 };

const resolvedCases = <Node>(
  examples: readonly { name: string; node: Node }[]
) =>
  (['light', 'dark'] as const).flatMap((scheme) =>
    examples.map(({ name, node }) => ({
      name: `${name} (${scheme})`,
      node,
      scheme,
    }))
  );

describe('elastic-charts renderer: resolved xyChart examples', () => {
  it.each(resolvedCases(xyChartExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'xy') {
      throw new Error('expected an xy Scene');
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

describe('elastic-charts renderer: resolved metric examples', () => {
  it.each(resolvedCases(metricExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'metric') {
      throw new Error('expected a metric Scene');
    }
    const text = (await draw(scene)).textContent ?? '';
    for (const { title, value, secondary } of scene.tiles) {
      expect(text).toContain(title);
      expect(text).toContain(value.text);
      if (secondary) {
        expect(text).toContain(secondary.text);
      }
    }
  });
});

describe('elastic-charts renderer', () => {
  it('draws metric and xy in the browser', () => {
    expect(renderer.id).toBe('elastic-charts');
    expect(renderer.environments).toEqual(['browser']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
  });
});
