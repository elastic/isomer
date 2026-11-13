/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { readChartEvent } from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { ActionEventRef } from '@elastic/isomer-sdk';
import { View } from 'vega';

import { hydrateVega } from './client';
import { vegaPack } from './pack';
import { VEGA_INTERACTIVE } from './primitive';
import { brushExample, vegaExample } from './schema/examples';
import type { VegaNode } from './schema/node';

const runtime = createIsomerRuntime({ packs: [vegaPack] });

const mount = (node: VegaNode, enhancements: string[] = [VEGA_INTERACTIVE]) => {
  const root = document.createElement('div');
  const { html } = runtime.surfaces.html.render(
    { type: 'view', body: [node] },
    { enhancements }
  );
  root.append(
    ...new DOMParser().parseFromString(html, 'text/html').body.childNodes
  );
  document.body.append(root);
  return root;
};

describe('hydrateVega', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('replaces the server SVG with a live view', async () => {
    const root = mount(vegaExample);
    const before = root.querySelector('[data-isomer-vega-chart] svg');
    const { views, dispose } = await hydrateVega(root);
    expect(views).toHaveLength(1);
    const after = root.querySelector('[data-isomer-vega-chart] svg');
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
    expect(views[0]?.data('table')).toHaveLength(5);
    dispose();
  });

  it('leaves a chart rendered without the enhancement as it is', async () => {
    const root = mount(vegaExample, []);
    const before = root.querySelector('[data-isomer-vega-chart] svg');
    const { views } = await hydrateVega(root);
    expect(views).toHaveLength(0);
    expect(root.querySelector('[data-isomer-vega-chart] svg')).toBe(before);
  });

  it('keeps the server SVG of a chart that cannot start, and the others live', async () => {
    const root = mount(vegaExample);
    root.append(
      ...mount(vegaExample).childNodes,
      ...mount(vegaExample).childNodes
    );
    const charts = root.querySelectorAll('[data-isomer-vega-chart]');
    const [failing, unreadable] = Array.from(charts, (chart) =>
      chart.querySelector('svg')
    );
    root.querySelectorAll('script[data-isomer-vega-spec]')[1]!.textContent =
      '{';
    vi.spyOn(View.prototype, 'runAsync').mockRejectedValueOnce(
      new Error('boom')
    );
    const { views, dispose } = await hydrateVega(root);
    expect(views).toHaveLength(1);
    expect(charts[0]?.querySelector('svg')).toBe(failing);
    expect(charts[1]?.querySelector('svg')).toBe(unreadable);
    expect(views[0]?.container()).toBe(charts[2]);
    dispose();
    vi.restoreAllMocks();
  });

  it('re-hardens an embedded spec someone edited', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const root = mount(vegaExample);
    const script = root.querySelector('script[data-isomer-vega-spec]');
    const embedded = JSON.parse(script?.textContent ?? '{}') as {
      spec: {
        data: { name: string; url?: string }[];
        config: { events: { selector: boolean } };
      };
    };
    const { spec } = embedded;
    spec.data[0] = {
      name: spec.data[0]?.name ?? 'x',
      url: 'https://example.com/a.json',
    };
    spec.config.events.selector = true;
    script!.textContent = JSON.stringify(embedded);
    const { views, dispose } = await hydrateVega(root);
    expect(fetch).not.toHaveBeenCalled();
    expect(views).toHaveLength(1);
    expect(views[0]?.data('table')).toEqual([]);
    expect(
      root.querySelector('[data-isomer-vega-chart]')?.innerHTML
    ).not.toContain('example.com');
    dispose();
  });

  it('scrubs what data and signals set on the client, as the server does', async () => {
    const root = mount(vegaExample);
    const script = root.querySelector('script[data-isomer-vega-spec]');
    const embedded = JSON.parse(script?.textContent ?? '{}') as {
      spec: {
        background?: unknown;
        data: { name: string; values?: object[] }[];
        marks: { encode: { update: Record<string, unknown> } }[];
      };
    };
    const { spec } = embedded;
    spec.background = { signal: "'url(https://evil/bg.svg#p)'" };
    const [source] = spec.data;
    if (source) {
      source.values = [{ day: 'Mon', errors: 1, paint: 'url(https://evil/p)' }];
    }
    const [bars] = spec.marks;
    if (bars) {
      bars.encode.update.fill = { field: 'paint' };
    }
    script!.textContent = JSON.stringify(embedded);
    const { dispose } = await hydrateVega(root);
    const chart = root.querySelector('[data-isomer-vega-chart]');
    expect(chart?.innerHTML).toContain('<path');
    expect(chart?.innerHTML).not.toContain('evil');
    dispose();
  });

  it('raises a brush from the signal the node names, as a chart event', async () => {
    const root = mount(brushExample);
    const events: ActionEventRef[] = [];
    const { views, dispose } = await hydrateVega(root, {
      onEvent: (event) => events.push(event),
    });
    const from = Date.UTC(2026, 2, 3);
    const to = Date.UTC(2026, 2, 6);
    await views[0]!.signal('brush_day', [from, to]).runAsync();
    const brushes = events.map(readChartEvent).filter(Boolean);
    expect(events.map(({ name }) => name)).toContain('chart.brush');
    expect(brushes.at(-1)).toEqual({
      kind: 'brush',
      node: 'requests-brush',
      column: 'day',
      range: [from, to],
      values: {},
      description: 'Day: Mar 3 to Mar 6',
    });
    dispose();
  });

  it('raises nothing without onEvent', async () => {
    const root = mount(brushExample);
    const { views, dispose } = await hydrateVega(root);
    await views[0]!.signal('brush_day', [0, 1]).runAsync();
    dispose();
  });
});
