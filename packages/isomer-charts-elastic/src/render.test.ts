/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Draws each example Scene with Elastic Charts and reads back what it drew,
// through the `DebugState` Kibana's functional tests read (and the page, for
// the metric chart, which reports none). Every string and color must be the
// Scene's: that is Gate B's content criterion for this renderer.

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { DebugState } from '@elastic/charts';
import {
  metricSingleValueScene,
  type Scene,
  type SceneAxis,
  xyInteractiveScene,
  type XyScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import { afterEach, describe, expect, it } from 'vitest';

import { createElasticChartsRenderer } from './renderer';

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

const draw = async (scene: Scene): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(renderer.render(scene, { environment: 'browser' }) as never);
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

/** Each drawn label is the Scene's label for that position. */
const expectLabelsFromScene = (
  drawn: { labels: string[]; values: unknown[] } | undefined,
  axis: SceneAxis,
  scene: XyScene
) => {
  expect(drawn).toBeDefined();
  const sceneLabels = new Map<unknown, string>([
    ...scene.categories.map(({ x, label }) => [x, label] as const),
    ...axis.ticks.map(({ value, label }) => [value, label] as const),
  ]);
  const shown = drawn!.labels
    .map((label, index) => [drawn!.values[index], label] as const)
    .filter(([, label]) => label !== '');
  expect(shown.length).toBeGreaterThan(0);
  for (const [value, label] of shown) {
    expect(label).toBe(sceneLabels.get(value));
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

  it('stacks bars to the Scene’s segments, in draw order', async () => {
    const state = await debugState(xyInteractiveScene);
    expect(
      state.bars?.map(({ name, color, bars }) => ({
        name,
        color,
        heights: bars.map(({ x, y }): unknown[] => [x, y]),
      }))
    ).toEqual(
      xyInteractiveScene.series.map(({ label, color, marks }) => ({
        name: label,
        color,
        heights: marks.map(({ x, y, y0 }) => [x, (y ?? 0) - (y0 ?? 0)]),
      }))
    );
  });

  it('draws line points where the Scene places its marks', async () => {
    const state = await debugState(xyTimeSeriesScene);
    const [series] = xyTimeSeriesScene.series;
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

describe('elastic-charts renderer: metric', () => {
  it('prints the Scene’s title and value', async () => {
    const container = await draw(metricSingleValueScene);
    const [tile] = metricSingleValueScene.tiles;
    expect(container.textContent).toContain(tile!.title);
    expect(container.textContent).toContain(tile!.value.text);
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
