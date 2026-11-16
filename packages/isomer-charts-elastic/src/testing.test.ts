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
import type { DebugState, DebugStateAxis } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  GaugeScene,
  HeatmapScene,
  PartitionScene,
  Scene,
  SceneTimeBand,
  XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  gaugeExamples,
  heatmapExamples,
  partitionChartExamples,
  xyChartExamples,
  type XyChartNode,
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
let size = SIZE;
let wide = new Set<string>();
const labelWidth = (text: string) => (wide.has(text) ? 200 : text.length * 6);

// jsdom has no layout and no canvas: Elastic Charts learns its size from
// ResizeObserver and measures text through a 2D context.
globalThis.ResizeObserver = class {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { ...size, top: 0, left: 0 },
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
            width: labelWidth(text),
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
afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  size = SIZE;
  wide = new Set();
});

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
  ...gaugeExamples,
]
  .map(({ name, node }): { name: string; scene: Scene } => ({
    name,
    scene: resolveChart(node, { scheme: 'light', size: SIZE }),
  }))
  .filter(
    ({ scene }) =>
      !(
        (scene.kind === 'partition' ||
          scene.kind === 'heatmap' ||
          scene.kind === 'gauge') &&
        scene.empty
      )
  );

describe('debugStateProblems', () => {
  it.each(scenes)(
    'passes what Elastic Charts draws for $name',
    async ({ scene }) => {
      const state = await debugStateOf(scene);
      expect(debugStateProblems(scene, state)).toEqual([]);
      expect(debugStateProblems(scene, state, { labelWidth })).toEqual([]);
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

  const timeScenes = scenes.filter(
    (entry): entry is { name: string; scene: XyScene } =>
      entry.scene.kind === 'xy' && entry.scene.axes.x.timeTicks !== undefined
  );
  const withX = (state: DebugState, x: Partial<DebugStateAxis>) => ({
    ...state,
    axes: { ...state.axes!, x: [{ ...state.axes!.x[0]!, ...x }] },
  });

  // At this size every band of the monthly example labels years alone.
  const bandedScenes = timeScenes.filter(({ name }) =>
    [
      'Time axis by the minute',
      'Time axis by the hour across a daylight saving change',
      'Time axis by the day',
    ].includes(name)
  );

  it.each(bandedScenes)(
    'fails another band’s time labels at the drawn width for $name',
    async ({ scene }) => {
      const state = await debugStateOf(scene);
      const { labels, values } = state.axes!.x[0]!;
      const drawn = labels.map((label, index) => `${values[index]} ${label}`);
      const keysOf = ({ layers }: SceneTimeBand) =>
        layers.flatMap(({ ticks }) =>
          ticks.flatMap(({ at, label }) =>
            label === '' ? [] : [`${at} ${label}`]
          )
        );
      // A band that labels a tick the drawing does not, and lacks one it does.
      const other = scene.axes.x.timeTicks!.bands.find((band) => {
        const keys = keysOf(band);
        return (
          keys.some((key) => !drawn.includes(key)) &&
          drawn.some((key) => !keys.includes(key))
        );
      });
      expect(other).toBeDefined();
      const labeled = other!.layers.flatMap(({ ticks }) =>
        ticks.filter(({ label }) => label !== '')
      );
      const changed = withX(state, {
        labels: labeled.map(({ label }) => label),
        values: labeled.map(({ at }) => at),
      });
      expect(debugStateProblems(scene, changed)).not.toEqual([]);
    }
  );

  it('fails a time axis missing its major row', async () => {
    const scene = timeScenes.find(
      ({ name }) => name === 'Time axis by the minute'
    )!.scene;
    const state = await debugStateOf(scene);
    const { labels, values } = state.axes!.x[0]!;
    const minor = labels.flatMap((label, index): [string, unknown][] =>
      label.endsWith('2026') ? [] : [[label, values[index]]]
    );
    expect(minor.length).toBeLessThan(labels.length);
    const changed = withX(state, {
      labels: minor.map(([label]) => label),
      values: minor.map(([, value]) => value),
    });
    expect(debugStateProblems(scene, state, { labelWidth })).toEqual([]);
    expect(
      debugStateProblems(scene, changed, { labelWidth }).join('\n')
    ).toMatch(/axis "x" leaves out .*2026"/);
  });

  it('passes a narrow time axis whose major row loses both its labels to measured text', async () => {
    size = { width: 150, height: 300 };
    const { node } = xyChartExamples.find(
      ({ name }) => name === 'Time axis by the minute'
    )!;
    const scene = resolveChart(node, { scheme: 'light', size });
    const state = await debugStateOf(scene);
    expect(
      state.axes!.x[0]!.labels.some((label) => label.endsWith('2026'))
    ).toBe(false);
    expect(debugStateProblems(scene, state)).toEqual([]);
    expect(debugStateProblems(scene, state, { labelWidth })).toEqual([]);
  });

  it('holds each time-layer edge label to its own width, not the widest in its layer', async () => {
    wide = new Set(['01:00']);
    const { name, scene } = timeScenes[0]!;
    expect(name).toBe('Time series line');
    const state = await debugStateOf(scene);
    const { labels, values } = state.axes!.x[0]!;
    expect(labels).toEqual(expect.arrayContaining(['00:00', '01:00', '04:00']));
    expect(debugStateProblems(scene, state, { labelWidth })).toEqual([]);
    const kept: [string, unknown][] = labels.flatMap((label, index) =>
      label === '00:00' ? [] : [[label, values[index]]]
    );
    const changed = withX(state, {
      labels: kept.map(([label]) => label),
      values: kept.map(([, value]) => value),
    });
    expect(
      debugStateProblems(scene, changed, { labelWidth }).join('\n')
    ).toMatch(/axis "x" leaves out .* "00:00"/);
  });

  it('passes time-axis gridlines that cannot measure the plot', async () => {
    const start = Date.UTC(2026, 10, 3);
    const node: XyChartNode = {
      type: 'xyChart',
      data: {
        columns: [
          { id: 'time', label: 'time', type: 'date', role: 'dimension' },
          { id: 'count', label: 'count', type: 'number', role: 'metric' },
        ],
        rows: [0, 1, 2, 3].map((hours) => [start + hours * 3_600_000, hours]),
      },
      layers: [
        { kind: 'data', mark: 'line', x: 'time', y: [{ column: 'count' }] },
      ],
      axes: {
        x: {
          scale: 'temporal',
          interval: 3_600_000,
          domain: { kind: 'custom', min: start, max: start + 1_800_000 },
        },
      },
    };
    const scene = resolveChart(node, { scheme: 'light', size: SIZE });
    const state = await debugStateOf(scene);
    expect(state.axes!.x[0]!.gridlines.map(({ x }) => Math.round(x))).toEqual([
      0,
    ]);
    expect(debugStateProblems(scene, state)).toEqual([]);
    expect(debugStateProblems(scene, state, { labelWidth })).toEqual([]);
    const moved = withX(state, {
      gridlines: state.axes!.x[0]!.gridlines.map(({ y }) => ({ x: 100, y })),
    });
    expect(debugStateProblems(scene, moved).join('\n')).toMatch(
      /axis "x" draws gridlines at \[100\]/
    );
  });

  it('fails time-axis gridlines no band puts where they are drawn', async () => {
    const scene = timeScenes[0]!.scene;
    const state = await debugStateOf(scene);
    const changed = withX(state, {
      gridlines: state.axes!.x[0]!.gridlines.map(({ x, y }) => ({
        x: x * 1.5 + 7,
        y,
      })),
    });
    expect(debugStateProblems(scene, changed).join('\n')).toMatch(
      /axis "x" draws gridlines at/
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

  it('reads a `#rgb` heat map cell color, and matches it to no fill that is no color', async () => {
    const heatmap = scenes.find(({ scene }) => scene.kind === 'heatmap')!
      .scene as HeatmapScene;
    const state = await debugStateOf(heatmap);
    const [first, ...rest] = state.heatmap!.cells;
    const { originalIndex } = first!.datum as { originalIndex: number };
    const short: HeatmapScene = {
      ...heatmap,
      cells: heatmap.cells.map((cell, index) =>
        index === originalIndex ? { ...cell, color: '#abc' } : cell
      ),
    };
    const filled = (fill: string) =>
      debugStateProblems(short, {
        ...state,
        heatmap: { ...state.heatmap!, cells: [{ ...first!, fill }, ...rest] },
      }).filter((problem) => problem.includes('is filled'));
    for (const fill of [
      'rgba(170, 187, 204, 1)',
      'rgb(170,187,204)',
      'rgb(170 187 204 / 0.5)',
      '#AABBCC',
      '#abcf',
    ]) {
      expect(filled(fill), fill).toEqual([]);
    }
    for (const fill of [
      'none',
      'currentColor',
      'rgba(171, 187, 204, 1)',
      'rgb(170, 187)',
      'rgb(170 187 204 128)',
      'rgb(170 187 / 204)',
      'rgb(170, 187 204)',
      'rgb(170, 187, 2040)',
      'rgb(67%, 73%, 80%)',
      'rgba(170, 187, 204, 1) junk',
    ]) {
      expect(filled(fill), fill).toEqual([
        `cell ${originalIndex} is filled ${fill}, not #abc`,
      ]);
    }
  });

  it('fails a gauge with another value or band', async () => {
    const gauge = scenes.find(({ scene }) => scene.kind === 'gauge')!
      .scene as GaugeScene;
    const state = await debugStateOf(gauge);
    const rows = state.bullet!.rows.map((row) =>
      row.map(
        (bullet) =>
          bullet && {
            ...bullet,
            value: bullet.value + 1,
            colorBands: ['#123456'],
          }
      )
    );
    const changed = { ...state, bullet: { ...state.bullet!, rows } };
    const problems = debugStateProblems(gauge, changed).join('\n');
    expect(problems).toMatch(/^bullet are /m);
    expect(problems).toMatch(/^bands are /m);
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
