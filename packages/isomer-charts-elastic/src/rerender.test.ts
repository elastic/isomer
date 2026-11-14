/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// What a host re-render costs: the Scene and env the charts pack hands this
// engine across two renders of one unchanged node, and what Elastic Charts
// draws again for them. The docs' known gaps record it.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act as testUtilsAct } from 'react-dom/test-utils';
import {
  type ChartsRenderContext,
  createChartsPack,
} from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  Scene,
  SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';
import {
  tagCloudExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { afterEach, describe, expect, it } from 'vitest';

import { createElasticChartsRenderer } from './renderer';

// React 18.3 exports `act` from `react`; earlier 18.x only from `react-dom/test-utils`.
const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

// jsdom has no layout and no canvas: Elastic Charts learns its size from
// ResizeObserver and measures text through a 2D context.
class FixedResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 480, height: 240, top: 0, left: 0 },
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

/** How many times Elastic Charts cleared a canvas to draw it, or read one to lay a tag cloud out. */
let repaints = 0;
const context = new Proxy(
  {},
  {
    get: (_, key) => {
      if (key === 'measureText') {
        return (text: string) => ({
          width: text.length * 6,
          actualBoundingBoxAscent: 8,
          actualBoundingBoxDescent: 2,
          fontBoundingBoxAscent: 9,
          fontBoundingBoxDescent: 3,
        });
      }
      if (key === 'getLineDash') {
        return () => [];
      }
      if (key === 'clearRect') {
        return () => {
          repaints += 1;
        };
      }
      if (key === 'getImageData') {
        return (_x: number, _y: number, width: number, height: number) => {
          repaints += 1;
          return { data: new Uint8ClampedArray(width * height * 4) };
        };
      }
      return typeof key === 'string' && key.startsWith('create')
        ? () => ({ addColorStop: () => undefined })
        : () => undefined;
    },
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

const engine = createElasticChartsRenderer();
const roots: (() => void)[] = [];

afterEach(() => {
  roots.splice(0).forEach((unmount) => unmount());
});

const nextTask = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** Renders `element()` in one task, then again in a later one, and counts each render's repaints. */
const renderTwice = async (element: () => React.ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  const repaintsOf = async () => {
    repaints = 0;
    act(() => root.render(element() as never));
    await nextTask();
    return repaints;
  };
  return { first: await repaintsOf(), second: await repaintsOf() };
};

describe.each([
  ['xy', xyChartExamples[0]!.node],
  ['tagCloud', tagCloudExamples[0]!.node],
] as const)('a host re-render of one unchanged %s node', (_, node) => {
  it('hands the engine a new, equal Scene and a new env, and draws again', async () => {
    const received: { scene: Scene; env: SceneRenderEnv }[] = [];
    const pack = createChartsPack({
      sceneRenderers: [
        {
          ...engine,
          render: (scene, env) => {
            received.push({ scene, env });
            return engine.render(scene, env);
          },
        },
      ],
    });
    const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
      packs: [pack],
    });
    const composition: Composition = { type: 'view', body: [node] };
    const context: ChartsRenderContext = {
      environment: 'browser',
      scheme: 'light',
      onEvent: () => undefined,
    };
    const { first, second } = await renderTwice(() =>
      runtime.surfaces.react.render(composition, { context, heading: false })
    );
    expect(received).toHaveLength(2);
    const [before, after] = received as [
      (typeof received)[number],
      (typeof received)[number],
    ];
    expect(after.scene).not.toBe(before.scene);
    expect(after.scene).toEqual(before.scene);
    expect(after.env).not.toBe(before.env);
    expect(after.env.onEvent).not.toBe(before.env.onEvent);
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it('draws again for one Scene and env, and not for one element', async () => {
    const scene = resolveChart(node, { scheme: 'light' });
    const env: SceneRenderEnv = {
      environment: 'browser',
      onEvent: () => undefined,
    };
    const rebuilt = await renderTwice(() => engine.render(scene, env));
    expect(rebuilt.first).toBeGreaterThan(0);
    expect(rebuilt.second).toBe(rebuilt.first);
    const drawn = engine.render(scene, env);
    const reused = await renderTwice(() => drawn);
    expect(reused.first).toBe(rebuilt.first);
    expect(reused.second).toBe(0);
  });
});
