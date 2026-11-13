/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// The DebugState checks against what the browser engine draws in jsdom, which
// reports the same DebugState as any static drawing with Elastic Charts.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act as testUtilsAct } from 'react-dom/test-utils';
import type { DebugState } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  HeatmapScene,
  PartitionScene,
  Scene,
  XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  heatmapExamples,
  partitionChartExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { createElasticChartsRenderer } from './renderer';
import {
  debugStateColors,
  debugStateProblems,
  debugStateTexts,
} from './testing';

const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };
const SIZE = { width: 480, height: 300 };

// jsdom has no layout and no canvas: Elastic Charts learns its size from
// ResizeObserver and measures text through a 2D context.
globalThis.ResizeObserver = class {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { ...SIZE, top: 0, left: 0 },
        } as unknown as ResizeObserverEntry,
      ],
      this
    );
  }
  unobserve() {}
  disconnect() {}
};
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
const unmounts: (() => void)[] = [];
afterEach(() => unmounts.splice(0).forEach((unmount) => unmount()));

const debugStateOf = async (scene: Scene): Promise<DebugState> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(renderer.render(scene, { environment: 'browser' }) as never);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  unmounts.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  const raw = container
    .getElementsByClassName('echChartStatus')[0]
    ?.getAttribute('data-ech-debug-state');
  if (!raw) {
    throw new Error('Elastic Charts wrote no DebugState');
  }
  return JSON.parse(raw) as DebugState;
};

const scenes = [
  ...xyChartExamples,
  ...partitionChartExamples,
  ...heatmapExamples,
]
  .map(({ name, node }): { name: string; scene: Scene } => ({
    name,
    scene: resolveChart(node, { scheme: 'light', size: SIZE }),
  }))
  .filter(
    ({ scene }) =>
      !((scene.kind === 'partition' || scene.kind === 'heatmap') && scene.empty)
  );

describe('debugStateProblems', () => {
  it.each(scenes)(
    'passes what Elastic Charts draws for $name',
    async ({ scene }) => {
      expect(debugStateProblems(scene, await debugStateOf(scene))).toEqual([]);
    }
  );

  const xy = scenes.find(({ scene }) => scene.kind === 'xy')!.scene as XyScene;
  const partition = scenes.find(({ scene }) => scene.kind === 'partition')!
    .scene as PartitionScene;

  it('fails a tick label other than the Scene’s', async () => {
    const state = await debugStateOf(xy);
    const [axis] = state.axes!.x;
    const changed = {
      ...state,
      axes: {
        ...state.axes!,
        x: [
          {
            ...axis!,
            labels: axis!.labels.map((label, index) =>
              index === 0 ? `${label}!` : label
            ),
          },
        ],
      },
    };
    expect(debugStateProblems(xy, changed).join('\n')).toMatch(
      /axis "x" labels .*!"/
    );
  });

  it('fails a series in another color', async () => {
    const state = await debugStateOf(xy);
    const lines = (state.lines ?? []).map((line) => ({
      ...line,
      color: '#123456',
    }));
    const bars = (state.bars ?? []).map((bar) => ({
      ...bar,
      color: '#123456',
    }));
    const areas = (state.areas ?? []).map((area) => ({
      ...area,
      color: '#123456',
    }));
    expect(debugStateProblems(xy, { ...state, lines, bars, areas })[0]).toMatch(
      /^series drawn are /
    );
  });

  it('fails a partition missing a slice, and no DebugState at all', async () => {
    const state = await debugStateOf(partition);
    const [layer] = state.partition!;
    const changed = {
      ...state,
      partition: [{ ...layer!, partitions: layer!.partitions.slice(1) }],
    };
    expect(debugStateProblems(partition, changed).join('\n')).toMatch(
      /slices drawn, not/
    );
    expect(debugStateProblems(partition, undefined)).toEqual([
      'Elastic Charts reports no DebugState',
    ]);
  });

  it('fails a heat map cell in another color or with another value', async () => {
    const heatmap = scenes.find(({ scene }) => scene.kind === 'heatmap')!
      .scene as HeatmapScene;
    const state = await debugStateOf(heatmap);
    const [first, ...rest] = state.heatmap!.cells;
    const changed = {
      ...state,
      heatmap: {
        ...state.heatmap!,
        cells: [
          { ...first!, fill: 'rgba(1, 2, 3, 1)', formatted: 'other' },
          ...rest,
        ],
      },
    };
    const problems = debugStateProblems(heatmap, changed).join('\n');
    expect(problems).toMatch(/cell \d+ is filled rgba\(1, 2, 3, 1\)/);
    expect(problems).toMatch(/cell \d+ reads "other"/);
  });

  it('reads the text and colors Elastic Charts reports', async () => {
    const state = await debugStateOf(xy);
    const titles = [xy.axes.x, xy.axes.y].flatMap((axis) =>
      axis?.title ? [axis.title] : []
    );
    expect(debugStateTexts(state)).toEqual(expect.arrayContaining(titles));
    expect(debugStateColors(state).length).toBeGreaterThan(0);
  });
});
