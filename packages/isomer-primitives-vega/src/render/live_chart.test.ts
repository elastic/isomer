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
import { readChartEvent } from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { ActionEventRef } from '@elastic/isomer-sdk';
import { View } from 'vega';

import { vegaPack } from '../pack';
import {
  brushExample,
  mapExample,
  signalExample,
  vegaGrammarExample,
} from '../primitives/vega/examples';
import { MAX_DRAWN_ITEMS } from '../primitives/vega/schema';

import * as live from './live';
/** `react` exports `act` from 18.3; `react-dom/test-utils` covers earlier 18.x. */
const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

const runtime = createIsomerRuntime({ packs: [vegaPack] });

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mount = async (
  node: object,
  onEvent?: (event: ActionEventRef) => void
) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      runtime.surfaces.react.render(
        { type: 'view', body: [node as typeof brushExample] },
        { ...(onEvent && { context: { onEvent } }), heading: false }
      )
    );
  });
  // Lets the view's first run finish.
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  return { container, root };
};

describe('the react renderer in a browser', () => {
  afterEach(() => document.body.replaceChildren());

  it('replaces its SVG with a live view that raises the node’s chart events', async () => {
    const events: ActionEventRef[] = [];
    const spy = vi.spyOn(live, 'startLiveView');
    const { container, root } = await mount(brushExample, (event) =>
      events.push(event)
    );
    expect(
      container.querySelector('[data-isomer-vega-chart] svg')
    ).not.toBeNull();
    const view = (await spy.mock.results[0]?.value) as View | undefined;
    expect(view).toBeDefined();
    const from = Date.UTC(2026, 2, 2);
    const to = Date.UTC(2026, 2, 4);
    await act(async () => {
      await view!.signal('brush_day', [from, to]).runAsync();
    });
    expect(events.map(readChartEvent).at(-1)).toMatchObject({
      kind: 'brush',
      node: 'requests-brush',
      range: [from, to],
    });
    act(() => root.unmount());
    spy.mockRestore();
  });

  it('keeps a newer live view when an older one fails late', async () => {
    let fail: (error: Error) => void = () => undefined;
    const runAsync = vi
      .spyOn(View.prototype, 'runAsync')
      .mockImplementationOnce(
        () => new Promise((_, reject) => (fail = reject))
      );
    const { container, root } = await mount(brushExample);
    const render = (onEvent?: (event: ActionEventRef) => void) =>
      runtime.surfaces.react.render(
        { type: 'view', body: [brushExample] },
        { ...(onEvent && { context: { onEvent } }), heading: false }
      );
    act(() => root.render(render(() => undefined)));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const chart = container.querySelector('[data-isomer-vega-chart]');
    const live = chart?.querySelector('svg');
    expect(live).not.toBeNull();
    await act(async () => {
      fail(new Error('boom'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(chart?.querySelector('svg')).toBe(live);
    act(() => root.unmount());
    runAsync.mockRestore();
  });

  it('restarts the live view when the node’s interactions change', async () => {
    const spy = vi.spyOn(live, 'startLiveView');
    const { root } = await mount(brushExample);
    const render = (node: typeof brushExample) =>
      runtime.surfaces.react.render(
        { type: 'view', body: [node] },
        { heading: false }
      );
    act(() => root.render(render({ ...brushExample, id: 'renamed' })));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[2]?.node?.id).toBe('renamed');
    act(() => root.unmount());
    spy.mockRestore();
  });

  it('restarts the live view when only an event handler changes', async () => {
    const spy = vi.spyOn(live, 'startLiveView');
    const chart = (update: string) => ({
      ...vegaGrammarExample,
      spec: {
        signals: [{ name: 'picked', on: [{ events: 'click', update }] }],
        marks: [{ type: 'rect', encode: { enter: { width: { value: 4 } } } }],
      },
    });
    const { root } = await mount(chart('1'));
    const render = (node: object) =>
      runtime.surfaces.react.render(
        { type: 'view', body: [node as typeof brushExample] },
        { heading: false }
      );
    act(() => root.render(render(chart('2'))));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(spy).toHaveBeenCalledTimes(2);
    act(() => root.unmount());
    spy.mockRestore();
  });

  it('keeps the view’s bound inputs out of the chart’s image role', async () => {
    const { container, root } = await mount(signalExample);
    const chart = container.querySelector('[data-isomer-vega-chart]');
    expect(chart?.getAttribute('role')).toBe('group');
    expect(chart?.querySelector('input[type="range"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('keeps a chart with a basemap static', async () => {
    const spy = vi.spyOn(live, 'startLiveView');
    const tile = 'data:image/png;base64,iVBORw0KGgo=';
    const { root } = await mount({
      ...mapExample,
      basemap: { tiles: [{ src: tile, x: 0, y: 0, width: 256, height: 256 }] },
    });
    expect(spy).not.toHaveBeenCalled();
    act(() => root.unmount());
    spy.mockRestore();
  });
});

describe('startLiveView', () => {
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v6.json',
    width: 100,
    height: 50,
    data: [{ name: 'table', values: [{ x: 1 }] }],
    marks: [
      {
        type: 'symbol',
        from: { data: 'table' },
        encode: { enter: { x: { field: 'x' }, tooltip: { signal: 'datum' } } },
      },
    ],
  };
  const start = async (extra: object = {}, markup = '<svg></svg>') => {
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    const view = await live.startLiveView(container, { ...spec, ...extra });
    return { container, view };
  };
  afterEach(() => document.body.replaceChildren());

  it('shows no image from a tooltip’s data', async () => {
    const { view } = await start();
    const { _tooltip: tip } = view as unknown as {
      _tooltip: (...args: unknown[]) => void;
    };
    tip(
      {},
      new MouseEvent('pointermove'),
      {},
      { title: 'Row', image: 'https://attacker.example/x.png', x: 1 }
    );
    expect(document.querySelector('#vg-tooltip-element')).not.toBeNull();
    expect(document.querySelector('#vg-tooltip-element img')).toBeNull();
    expect(document.body.innerHTML).not.toContain('attacker.example');
    view.finalize();
  });

  it('keeps a `cursor` signal from setting a URL cursor', async () => {
    const { container, view } = await start({
      signals: [
        { name: 'cursor', value: 'url(https://attacker.example/c.png), auto' },
      ],
    });
    expect(container.style.cursor).not.toContain('url(');
    await view.signal('cursor', 'pointer').runAsync();
    expect(container.style.cursor).toBe('pointer');
    await view
      .signal('cursor', 'url(https://attacker.example/d.png)')
      .runAsync();
    expect(container.style.cursor).not.toContain('url(');
    view.finalize();
  });

  it('keeps the chart’s label, not Vega’s, and a group role once live', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<svg></svg>';
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', 'Errors by day.');
    document.body.append(container);
    const view = await live.startLiveView(container, spec);
    expect(container.getAttribute('aria-label')).toBe('Errors by day.');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.hasAttribute('aria-roledescription')).toBe(false);
    view.finalize();
  });

  it('skips a live draw past the mark cap, and refuses a first one', async () => {
    const counted = (count: number) => ({
      signals: [{ name: 'n', value: count }],
      data: [
        {
          name: 'table',
          transform: [{ type: 'sequence', start: 0, stop: { signal: 'n' } }],
        },
      ],
      marks: [
        {
          type: 'symbol',
          from: { data: 'table' },
          encode: { enter: { x: { field: 'data' } } },
        },
      ],
    });
    const { container, view } = await start(counted(10));
    expect(container.querySelectorAll('.mark-symbol path')).toHaveLength(10);
    await view.signal('n', MAX_DRAWN_ITEMS + 1).runAsync();
    expect(container.querySelectorAll('.mark-symbol path')).toHaveLength(10);
    view.finalize();
    await expect(start(counted(MAX_DRAWN_ITEMS + 1))).rejects.toThrow(
      /mark cap/
    );
  });

  it('puts the server’s SVG back when initializing the view throws', async () => {
    vi.spyOn(View.prototype, 'initialize').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const container = document.createElement('div');
    container.innerHTML = '<svg data-server=""></svg>';
    document.body.append(container);
    await expect(live.startLiveView(container, spec)).rejects.toThrow('boom');
    expect(container.innerHTML).toBe('<svg data-server=""></svg>');
    vi.restoreAllMocks();
  });

  it('puts the server’s SVG back, not a finalized view’s, when a restart fails', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<svg data-server=""></svg>';
    document.body.append(container);
    const first = await live.startLiveView(container, spec);
    vi.spyOn(View.prototype, 'runAsync').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(live.startLiveView(container, spec)).rejects.toThrow('boom');
    expect(container.innerHTML).toBe('<svg data-server=""></svg>');
    first.finalize();
    vi.restoreAllMocks();
  });

  it('stays live when the brush names a signal the spec lacks', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<svg></svg>';
    document.body.append(container);
    const view = await live.startLiveView(container, spec, {
      onEvent: () => undefined,
      node: {
        ...brushExample,
        interactions: { brush: { column: 'day', signal: 'missing' } },
      },
    });
    expect(container.getAttribute('role')).toBe('group');
    view.finalize();
  });

  it('puts the server’s SVG back when a restart’s spec cannot parse', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<svg data-server=""></svg>';
    document.body.append(container);
    const first = await live.startLiveView(container, spec);
    await expect(
      live.startLiveView(container, {
        ...spec,
        signals: [{ name: 'x', update: '1 +' }],
      })
    ).rejects.toThrow();
    expect(container.innerHTML).toBe('<svg data-server=""></svg>');
    first.finalize();
  });

  it('goes back to the server’s SVG once its container comes to scale the drawing', async () => {
    const probe = await start();
    const svg = probe.container.querySelector('svg')!;
    const [width, height] = ['width', 'height'].map((side) =>
      Number(svg.getAttribute(side))
    );
    probe.view.finalize();
    const resized: Array<() => void> = [];
    let watching = false;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized.push(callback);
        }
        observe() {
          watching = true;
        }
        disconnect() {
          watching = false;
        }
      }
    );
    const markup = `<svg width="${width}" height="${height}"></svg>`;
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    await live.startLiveView(container, spec);
    expect(watching).toBe(true);
    Object.defineProperty(container, 'clientWidth', { value: width! - 10 });
    resized.forEach((callback) => callback());
    expect(container.innerHTML).toBe(markup);
    expect(watching).toBe(false);
    vi.unstubAllGlobals();
  });

  it('raises no brush while an update is past the mark cap and its drawing is stale', async () => {
    const events: unknown[] = [];
    const container = document.createElement('div');
    container.innerHTML = '<svg></svg>';
    document.body.append(container);
    const view = await live.startLiveView(
      container,
      {
        ...spec,
        signals: [
          { name: 'n', value: 10 },
          { name: 'range', value: null },
        ],
        data: [
          {
            name: 'table',
            transform: [{ type: 'sequence', start: 0, stop: { signal: 'n' } }],
          },
        ],
        marks: [
          {
            type: 'symbol',
            from: { data: 'table' },
            encode: { enter: { x: { field: 'data' } } },
          },
        ],
      },
      { onEvent: (event) => events.push(event), node: brushExample }
    );
    const brush = async (to: number) =>
      view.signal('range', [0, to]).runAsync();
    await brush(1);
    expect(events).toHaveLength(1);
    await view.signal('n', MAX_DRAWN_ITEMS + 1).runAsync();
    await brush(2);
    expect(events).toHaveLength(1);
    await view.signal('n', 10).runAsync();
    await brush(3);
    expect(events).toHaveLength(2);
    view.finalize();
  });

  it('keeps a chart the server scaled into its box static, since Vega would misplace the pointer', async () => {
    const markup = '<svg width="321" height="123"></svg>';
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    await expect(live.startLiveView(container, spec)).rejects.toThrow(/scaled/);
    expect(container.innerHTML).toBe(markup);
    expect(container.querySelector('svg')?.getAttribute('style')).toBeNull();
  });
});
