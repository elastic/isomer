/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act as testUtilsAct } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveChart } from '../scene/resolve';
import { TABLE_CHROME } from '../scene/theme';
import type { SceneRenderEnv } from '../scene/types';
import type { Cell } from '../schema/data';
import type { ChartEvent } from '../schema/events';
import type { LegacyMetricNode } from '../schema/legacy_metric';

import { legacyMetricSceneRenderer } from './legacy_metric';
import { legacyMetricModule } from './legacy_metric_styles';

// React 18.3 exports `act` from `react`; earlier 18.x only from `react-dom/test-utils`.
const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { vars } = legacyMetricModule;

const RED = { light: '#CC5642', dark: '#AA3322' };

const legacy = (
  rows: Cell[][],
  overrides: Partial<LegacyMetricNode> = {}
): LegacyMetricNode => ({
  type: 'legacyMetric',
  data: {
    columns: [
      { id: 'host', label: 'Host', type: 'string', role: 'dimension' },
      { id: 'n', label: 'Count', type: 'number', role: 'metric' },
    ],
    rows,
  },
  metrics: [{ column: 'n' }],
  breakdown: { column: 'host' },
  ...overrides,
});

const rows: Cell[][] = [
  ['a', 1],
  ['b', 2],
];

const unmounts: (() => void)[] = [];

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
});

const draw = (node: LegacyMetricNode, env: Partial<SceneRenderEnv> = {}) => {
  const scene = resolveChart(node, { scheme: 'light' });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      legacyMetricSceneRenderer.render(scene, {
        environment: 'browser',
        ...env,
      }) as never
    );
  });
  unmounts.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  const tiles = [
    ...container.querySelectorAll<HTMLElement>('[data-part="tile"]'),
  ];
  return { scene, container, tiles };
};

const selectable = legacy(rows, { interactions: { select: ['tile'] } });

describe('legacyMetricSceneRenderer', () => {
  it('raises chart.select for a tile on click, Enter and Space', () => {
    const events: ChartEvent[] = [];
    const { tiles } = draw(selectable, {
      nodeId: 'hosts',
      onEvent: (event) => events.push(event),
    });
    const [, second] = tiles;
    act(() => {
      second!.click();
      second!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      second!.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      second!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', bubbles: true })
      );
    });
    expect(second!.getAttribute('role')).toBe('button');
    expect(second!.tabIndex).toBe(0);
    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event).toMatchObject({
        kind: 'select',
        node: 'hosts',
        rows: [1],
        columns: ['host'],
        values: { host: 'b' },
      });
    }
  });

  it.each([
    ['no node id', selectable, undefined, true],
    ['no callback', selectable, 'hosts', false],
    ['no offered selection', legacy(rows), 'hosts', true],
  ] as const)('raises nothing with %s', (_, node, nodeId, callback) => {
    const events: ChartEvent[] = [];
    const { tiles } = draw(node, {
      ...(nodeId === undefined ? {} : { nodeId }),
      ...(callback
        ? { onEvent: (event: ChartEvent) => events.push(event) }
        : {}),
    });
    act(() => {
      tiles[0]!.click();
      tiles[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(events).toEqual([]);
    expect(tiles[0]!.getAttribute('role')).toBeNull();
  });

  it('labels the chart with its summary and description', () => {
    const { container, scene } = draw(
      legacy(rows, { description: 'Hosts reporting in the last hour.' })
    );
    expect(
      container.querySelector('[role="group"]')?.getAttribute('aria-label')
    ).toBe(`${scene.summary} Hosts reporting in the last hour.`);
  });

  it('lays each tile out from its resolved width', () => {
    const { scene, tiles } = draw(legacy(rows));
    expect(
      tiles.map(({ style }) => style.getPropertyValue(vars.tile.width.propName))
    ).toEqual(scene.tiles.map(({ box }) => `${box.width}px`));
  });

  it('shades emphasized tiles no band colors, and writes their notes', () => {
    const { container, tiles } = draw(
      legacy([...rows, ['c', 90]], {
        emphasis: [{ rows: [0], note: 'Busiest host' }, { rows: [2] }],
        colors: { bands: [{ from: 50, color: RED }] },
      })
    );
    const fill = vars.tile.fill.propName;
    expect(tiles.map((tile) => tile.getAttribute('data-emphasis'))).toEqual([
      'Busiest host',
      null,
      '',
    ]);
    expect(tiles.map(({ style }) => style.getPropertyValue(fill))).toEqual([
      TABLE_CHROME.light.emphasis,
      '',
      RED.light,
    ]);
    expect(
      [...container.querySelectorAll('[data-part="note"]')].map(
        ({ textContent }) => textContent
      )
    ).toEqual(['Busiest host']);
  });
});
