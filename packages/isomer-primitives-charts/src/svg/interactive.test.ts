/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// Interaction parity: the gestures behind `chartEventExamples`, made on
// `isomer-svg` over the Scene that reproduces them, raise exactly those events.

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act as testUtilsAct } from 'react-dom/test-utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { selectEvent } from '../scene/events';
import { metricSingleValueScene, xyInteractiveScene } from '../scene/examples';
import type { Scene, SceneSelection } from '../scene/types';
import type { ChartEvent } from '../schema/events';
import { chartEventExamples } from '../schema/examples/events';

import { InteractiveSceneSvg } from './interactive';
import { isomerSvgRenderer } from './renderer';
import { layoutXy } from './xy';

const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

const NODE = chartEventExamples[0]!.event.node;
const example = (name: string): ChartEvent =>
  chartEventExamples.find((entry) => entry.name === name)!.event;

let root: Root | undefined;
let host: HTMLElement;
let events: ChartEvent[];

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  host?.remove();
});

const mount = (scene: Scene) => {
  events = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      createElement(InteractiveSceneSvg, {
        scene,
        nodeId: NODE,
        onEvent: (event) => events.push(event),
      })
    )
  );
  return host.querySelector('svg')!;
};

const fire = (
  target: Element,
  type: string,
  init: MouseEventInit & { key?: string } = {}
) =>
  act(() => {
    const event =
      type === 'keydown'
        ? new KeyboardEvent(type, { bubbles: true, ...init })
        : new MouseEvent(type, { bubbles: true, ...init });
    target.dispatchEvent(event);
  });

// Matched by hand: jsdom's selector engine misreads an attribute value of "null".
const byAttr = (root: Element, name: string, value: string): Element | null =>
  [...root.querySelectorAll(`[${name}]`)].find(
    (element) => element.getAttribute(name) === value
  ) ?? null;

/** The `data-hit` of the xy mark whose selection names exactly `rows`. */
const markHit = (rows: readonly number[]) => {
  for (const [s, series] of xyInteractiveScene.series.entries()) {
    for (const [m, mark] of series.marks.entries()) {
      if (JSON.stringify(mark.selection?.rows) === JSON.stringify(rows)) {
        return `${s}:${m}`;
      }
    }
  }
  throw new Error(`no mark for rows ${rows.join(',')}`);
};

describe('isomer-svg interaction parity', () => {
  it('Select a bar segment: a click on the mark', () => {
    const expected = example('Select a bar segment') as Extract<
      ChartEvent,
      { kind: 'select' }
    >;
    const svg = mount(xyInteractiveScene);
    fire(byAttr(svg, 'data-hit', markHit(expected.rows))!, 'click');
    expect(events).toEqual([expected]);
  });

  it('Select the missing bucket: shown from the legend, then a click on the mark', () => {
    const expected = example('Select the missing bucket') as Extract<
      ChartEvent,
      { kind: 'select' }
    >;
    const svg = mount(xyInteractiveScene);
    const hit = markHit(expected.rows);
    // The node hides the missing series at first.
    expect(byAttr(svg, 'data-hit', hit)).toBeNull();
    const { key } = xyInteractiveScene.series[Number(hit.split(':')[0])]!;
    fire(byAttr(svg, 'data-legend-toggle', key)!, 'click');
    fire(byAttr(svg, 'data-hit', hit)!, 'click');
    expect(events).toEqual([expected]);
  });

  it('Filter out a legend item: an Alt+click on its label', () => {
    const expected = example('Filter out a legend item');
    const item = xyInteractiveScene.legend.items.find(
      ({ selection }) => selection?.values.status === 'Other'
    )!;
    const svg = mount(xyInteractiveScene);
    fire(byAttr(svg, 'data-legend-select', item.key)!, 'click', {
      altKey: true,
    });
    expect(events).toEqual([expected]);
  });

  it('Select an x category: a click on its tick', () => {
    const expected = example('Select an x category');
    const svg = mount(xyInteractiveScene);
    const tick = [...svg.querySelectorAll('[data-category]')].find(
      (element) => element.textContent === '01:00'
    )!;
    fire(tick, 'click');
    expect(events).toEqual([expected]);
  });

  it('Brush a time range: a drag across the first two hours', () => {
    const expected = example('Brush a time range') as Extract<
      ChartEvent,
      { kind: 'brush' }
    >;
    const svg = mount(xyInteractiveScene);
    const { scales } = layoutXy(xyInteractiveScene);
    const [from, to] = expected.range.map((value) => scales.x(value)) as [
      number,
      number,
    ];
    fire(svg, 'pointerdown', { clientX: from, clientY: 100 });
    fire(svg, 'pointermove', { clientX: to, clientY: 100 });
    expect(svg.querySelector('[data-part="brush"]')).not.toBeNull();
    fire(svg, 'pointerup', { clientX: to, clientY: 100 });
    fire(svg, 'click', { clientX: to, clientY: 100 });
    expect(events).toEqual([expected]);
    expect(svg.querySelector('[data-part="brush"]')).toBeNull();
  });

  it('a press without a drag raises no brush', () => {
    const svg = mount(xyInteractiveScene);
    fire(svg, 'pointerdown', { clientX: 200, clientY: 100 });
    fire(svg, 'pointerup', { clientX: 201, clientY: 100 });
    expect(events).toEqual([]);
  });
});

describe('isomer-svg local interactions', () => {
  it('shows the Scene tooltip for the mark under the pointer and dims other series', () => {
    const svg = mount(xyInteractiveScene);
    const hit = markHit(
      (example('Select a bar segment') as { rows: number[] }).rows
    );
    const [s, m] = hit.split(':').map(Number) as [number, number];
    const { tooltip } = xyInteractiveScene.series[s]!.marks[m]!;
    fire(byAttr(svg, 'data-hit', hit)!, 'pointerover');
    const shown = svg.querySelector('[data-part="tooltip"]')!.textContent;
    expect(shown).toContain(tooltip.header!);
    for (const { label, value } of tooltip.entries) {
      expect(shown).toContain(`${label}: ${value}`);
    }
    const others = xyInteractiveScene.series.filter(
      ({ key }, index) =>
        index !== s &&
        !xyInteractiveScene.legend.items.find((item) => item.key === key)
          ?.hidden
    );
    for (const { key } of others) {
      expect(byAttr(svg, 'data-series', key)?.getAttribute('opacity')).toBe(
        '0.3'
      );
    }
    fire(byAttr(svg, 'data-hit', hit)!, 'pointerout');
    expect(svg.querySelector('[data-part="tooltip"]')).toBeNull();
  });

  it('toggles a series from its legend swatch, without an event', () => {
    const svg = mount(xyInteractiveScene);
    const { key } = xyInteractiveScene.legend.items[0]!;
    fire(byAttr(svg, 'data-legend-toggle', key)!, 'click');
    expect(byAttr(svg, 'data-series', key)).toBeNull();
    fire(byAttr(svg, 'data-legend-toggle', key)!, 'click');
    expect(byAttr(svg, 'data-series', key)).not.toBeNull();
    expect(events).toEqual([]);
  });

  it('moves focus over marks with the arrow keys and selects with Enter', () => {
    const svg = mount(xyInteractiveScene);
    expect(svg.getAttribute('tabindex')).toBe('0');
    fire(svg, 'keydown', { key: 'ArrowRight' });
    fire(svg, 'keydown', { key: 'ArrowRight' });
    expect(svg.querySelector('[data-part="focus"]')).not.toBeNull();
    const second = [...svg.querySelectorAll('[data-hit]')][1]!.getAttribute(
      'data-hit'
    )!;
    const [s, m] = second.split(':').map(Number) as [number, number];
    const selection = xyInteractiveScene.series[s]!.marks[m]!
      .selection as SceneSelection;
    expect(svg.getAttribute('aria-label')).toContain(selection.description);
    fire(svg, 'keydown', { key: 'Enter' });
    expect(events).toEqual([selectEvent(NODE, selection)]);
    fire(svg, 'keydown', { key: 'Escape' });
    expect(svg.querySelector('[data-part="focus"]')).toBeNull();
  });

  it('selects a metric tile', () => {
    const tile = metricSingleValueScene.tiles[0]!;
    const scene: Scene = {
      ...metricSingleValueScene,
      interactions: {
        ...metricSingleValueScene.interactions,
        select: ['tile'],
      },
      tiles: [
        {
          ...tile,
          selection: {
            target: 'tile',
            rows: [0],
            columns: [],
            values: {},
            description: tile.description,
          },
        },
      ],
    };
    const svg = mount(scene);
    fire(svg.querySelector('[data-hit="t:0"]')!, 'click');
    expect(events).toEqual([selectEvent(NODE, scene.tiles[0]!.selection!)]);
  });
});

describe('isomer-svg without onEvent', () => {
  it('draws static SVG: no focus, no handlers, no hit targets', () => {
    const markup = renderToStaticMarkup(
      isomerSvgRenderer.render(xyInteractiveScene, {
        environment: 'browser',
        nodeId: NODE,
      }) as never
    );
    expect(markup).not.toContain('tabindex');
    expect(markup).not.toContain('data-plot');
    expect(markup).not.toContain('fill-opacity="0"');
  });

  it('needs the node id as well as onEvent', () => {
    const markup = renderToStaticMarkup(
      isomerSvgRenderer.render(xyInteractiveScene, {
        environment: 'browser',
        onEvent: () => {},
      }) as never
    );
    expect(markup).not.toContain('tabindex');
  });
});
