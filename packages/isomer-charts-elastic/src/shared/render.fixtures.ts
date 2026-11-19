/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Draws Scenes with Elastic Charts in jsdom and reads back what it drew,
// through the `DebugState` Kibana's functional tests read (and the page, for
// the metric chart, which reports none). Every string and color must be the
// Scene's: that is Gate B's content criterion for this renderer. Importing it
// stubs jsdom's layout and canvas, so only a jsdom test file may.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act as testUtilsAct } from 'react-dom/test-utils';
import type { DebugState } from '@elastic/charts';
import type {
  Scene,
  SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';
import { afterEach } from 'vitest';

import { createElasticChartsRenderer } from '../renderer';

// React 18.3 exports `act` from `react`; earlier 18.x only from `react-dom/test-utils`.
export const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

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
/** Every fill and stroke color Elastic Charts sets, in paint order. */
export const paints: string[] = [];
/** Every other canvas call Elastic Charts makes, in order. */
export const calls: [name: string, args: unknown[]][] = [];
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
            : (...args: unknown[]) => {
                calls.push([String(key), args]);
              },
    set: (_, key, value) => {
      if (key === 'fillStyle' || key === 'strokeStyle') {
        paints.push(String(value));
      }
      return true;
    },
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

export const renderer = createElasticChartsRenderer({ debugState: true });
/** Unmounts each chart drawn in a test after it. */
export const roots: (() => void)[] = [];

afterEach(() => {
  roots.splice(0).forEach((unmount) => unmount());
});

/** A mounted chart: `redraw` renders another Scene into the same root. */
export const mount = async (
  scene: Scene,
  env: SceneRenderEnv = { environment: 'browser' }
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const redraw = async (next: Scene) => {
    act(() => {
      root.render(renderer.render(next, env) as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  await redraw(scene);
  roots.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return { container, redraw };
};

export const draw = async (
  scene: Scene,
  env?: SceneRenderEnv
): Promise<HTMLElement> => (await mount(scene, env)).container;

/** The legend Elastic Charts drew: each item's label and value. */
export const legendOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.echLegendItem')].map((item) => ({
    label: item.querySelector('.echLegendItem__label')?.textContent ?? '',
    value: item.querySelector('.echLegendItem__legendValue')?.textContent ?? '',
  }));

export const debugStateIn = (container: HTMLElement): DebugState => {
  const status = container.querySelector('[data-ech-debug-state]');
  const raw = status?.getAttribute('data-ech-debug-state');
  if (!raw) {
    throw new Error('Elastic Charts wrote no DebugState');
  }
  return JSON.parse(raw) as DebugState;
};

export const debugState = async (scene: Scene): Promise<DebugState> =>
  debugStateIn(await draw(scene));

export const SIZE = { width: 480, height: 240 };

/** Each example in both color schemes. */
export const resolvedCases = <Node>(
  examples: readonly { name: string; node: Node }[]
) =>
  (['light', 'dark'] as const).flatMap((scheme) =>
    examples.map(({ name, node }) => ({
      name: `${name} (${scheme})`,
      node,
      scheme,
    }))
  );
