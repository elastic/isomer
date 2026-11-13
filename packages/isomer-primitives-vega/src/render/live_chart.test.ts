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
import { brushExample, mapExample } from '../schema/examples';

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
