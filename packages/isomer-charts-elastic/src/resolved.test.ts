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

// Every schema example, resolved to a Scene and drawn by Elastic Charts: what
// Elastic Charts reports drawing carries the Scene's strings and colors.

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { DebugState } from '@elastic/charts';
import {
  type ColorScheme,
  resolveChart,
  type Scene,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { createElasticChartsRenderer } from './renderer';

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
const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
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
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
};

const SIZE = { width: 480, height: 240 };
const SCHEMES: ColorScheme[] = ['light', 'dark'];

const xyCases = SCHEMES.flatMap((scheme) =>
  xyChartExamples.map(({ name, node }) => ({
    name: `${name} (${scheme})`,
    scene: resolveChart(node, { scheme, size: SIZE }),
  }))
);

const metricCases = SCHEMES.flatMap((scheme) =>
  metricExamples.map(({ name, node }) => ({
    name: `${name} (${scheme})`,
    scene: resolveChart(node, { scheme, size: SIZE }),
  }))
);

const debugState = async (scene: XyScene): Promise<DebugState> => {
  const container = await draw(scene);
  const raw = container
    .querySelector('[data-ech-debug-state]')
    ?.getAttribute('data-ech-debug-state');
  if (!raw) {
    throw new Error('Elastic Charts wrote no DebugState');
  }
  return JSON.parse(raw) as DebugState;
};

describe('resolved xyChart examples drawn by Elastic Charts', () => {
  it.each(xyCases)('$name', async ({ scene }) => {
    const state = await debugState(scene);
    const labels = new Set([
      ...scene.categories.map(({ label }) => label),
      ...[scene.axes.x, scene.axes.y, scene.axes.y2].flatMap(
        (axis) => axis?.ticks.map(({ label }) => label) ?? []
      ),
    ]);
    for (const axis of [...(state.axes?.x ?? []), ...(state.axes?.y ?? [])]) {
      const shown = axis.labels.filter((entry) => entry !== '');
      const sceneAxis = scene.axes[axis.id as 'x' | 'y' | 'y2'];
      // Elastic Charts places ticks itself; at least one lands on a Scene tick.
      if (sceneAxis?.showTicks && sceneAxis.ticks.length > 0) {
        expect(shown.length).toBeGreaterThan(0);
      }
      for (const label of shown) {
        expect(labels).toContain(label);
      }
    }
    const drawn = [
      ...(state.bars ?? []),
      ...(state.lines ?? []),
      ...(state.areas ?? []),
    ].map(({ name, color }) => ({ name, color }));
    const expected = scene.series.map(({ label, color }) => ({
      name: label,
      color,
    }));
    expect(drawn).toEqual(expect.arrayContaining(expected));
    expect(drawn).toHaveLength(expected.length);
    if (scene.legend.visible) {
      expect(
        state.legend?.items.map(({ name, color }) => ({ name, color }))
      ).toEqual(
        scene.legend.items.map(({ label, color }) => ({ name: label, color }))
      );
    }
  });
});

describe('resolved metric examples drawn by Elastic Charts', () => {
  it.each(metricCases)('$name', async ({ scene }) => {
    if (scene.kind !== 'metric') {
      throw new Error('expected a metric Scene');
    }
    const text = (await draw(scene)).textContent ?? '';
    for (const tile of scene.tiles) {
      expect(text).toContain(tile.title);
      expect(text).toContain(tile.value.text);
      if (tile.secondary) {
        expect(text).toContain(tile.secondary.text);
      }
    }
  });
});
