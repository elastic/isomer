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
import type { Scene } from '@elastic/isomer-primitives-charts/scene';
import {
  heatmapExamples,
  type HeatmapNode,
} from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  debugState,
  debugStateIn,
  draw,
  legendOf,
  resolvedCases,
  SIZE,
} from '../../shared/render.fixtures';

import { heatmapTooltip, heatmapValueFormatter } from './heatmap';

describe('elastic-charts renderer: resolved heatmap examples', () => {
  it.each(resolvedCases(heatmapExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'heatmap') {
      throw new Error('expected a heatmap Scene');
    }
    const container = await draw(scene);
    if (scene.empty) {
      expect(container.textContent).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    const state = debugStateIn(container);
    const cells = state.heatmap?.cells ?? [];
    expect(cells).toHaveLength(scene.cells.length);
    for (const { datum, formatted } of cells) {
      const cell =
        scene.cells[(datum as { originalIndex: number }).originalIndex]!;
      expect(['', cell.valueText]).toContain(formatted);
    }
    expect(state.axes?.y?.[0]?.labels).toEqual(
      scene.y.categories.map(({ label }) => label)
    );
    if (scene.legend.visible) {
      expect(legendOf(container).map(({ label }) => label)).toEqual(
        scene.bands.map(({ label }) => label)
      );
    }
  });
});

describe('elastic-charts renderer: heatmap text', () => {
  const scene = resolveChart(
    heatmapExamples.find(({ name }) => name === 'Hourly by host')!.node,
    { scheme: 'light', size: SIZE }
  );
  if (scene.kind !== 'heatmap') {
    throw new Error('expected a heatmap Scene');
  }

  it('writes each cell its own value text, and none for a value two cells write differently', () => {
    const format = heatmapValueFormatter(scene);
    for (const { value, valueText } of scene.cells) {
      expect(format(value)).toBe(valueText);
    }
    const [first] = scene.cells;
    const clash = {
      ...scene,
      cells: [first!, { ...first!, y: 1, valueText: 'other' }],
    };
    expect(heatmapValueFormatter(clash)(first!.value)).toBe('');
  });

  it('shows a hovered cell’s positions and value, with its color', () => {
    const cell = scene.cells[4]!;
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(heatmapTooltip(scene), {
        values: [
          {
            datum: {
              x: scene.x.categories[cell.x]!.x,
              y: cell.y,
              value: cell.value,
            },
          },
        ],
      } as never)
    );
    expect(
      [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((one) => one.textContent)
      )
    ).toEqual([
      [scene.x.label, scene.x.categories[cell.x]!.label],
      [scene.y.label, scene.y.categories[cell.y]!.label],
      [scene.valueLabel, cell.valueText],
    ]);
    expect(page.innerHTML).toContain(cell.color);
  });
});

describe('elastic-charts renderer: a heatmap time axis', () => {
  const DAY = 86_400_000;
  // Midnights in Toronto (UTC-5), as ES|QL buckets a day in that zone.
  const start = Date.UTC(2026, 10, 3, 5);
  const days = [0, 1, 2, 3].map((day) => start + day * DAY);
  const node = (axes?: Record<string, unknown>) =>
    ({
      type: 'heatmap',
      data: {
        columns: [
          {
            id: 'day',
            label: 'day',
            type: 'date',
            role: 'dimension',
            format: { kind: 'date', day: 'numeric', timeZone: 'UTC' },
          },
          { id: 'os', label: 'os', type: 'string', role: 'dimension' },
          { id: 'n', label: 'n', type: 'number', role: 'metric' },
        ],
        rows: days.flatMap((day, index) => [
          [day, 'osx', index + 1],
          [day, 'ios', index + 5],
        ]),
      },
      x: { column: 'day', interval: DAY },
      y: { column: 'os' },
      value: { column: 'n' },
      ...(axes ? { axes } : {}),
    }) as HeatmapNode;
  const drawn = async (scene: Scene) => {
    const state = await debugState(scene);
    return {
      cells: state.heatmap?.cells.length,
      columns: (state.axes?.x?.[0]?.values ?? []).length,
    };
  };

  // A date format in UTC over buckets that start at Toronto's midnights laid
  // the grid on UTC's, which held no cell.
  it('draws every cell whose bucket starts off UTC midnight', async () => {
    const scene = resolveChart(node(), {
      scheme: 'light',
      size: { width: 600, height: 300 },
      timeZone: 'America/Toronto',
    });
    expect(scene.kind === 'heatmap' && scene.cells).toHaveLength(8);
    expect(await drawn(scene)).toEqual({ cells: 8, columns: 4 });
  });

  it('spans a custom domain with empty columns, as Lens’s `xDomain`', async () => {
    const scene = resolveChart(
      node({
        x: { domain: { kind: 'custom', min: start - 2 * DAY, max: days[3]! } },
      }),
      {
        scheme: 'light',
        size: { width: 600, height: 300 },
        timeZone: 'America/Toronto',
      }
    );
    expect(await drawn(scene)).toEqual({ cells: 8, columns: 6 });
  });
});
