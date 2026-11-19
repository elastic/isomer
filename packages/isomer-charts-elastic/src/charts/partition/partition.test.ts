/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { type CustomTooltip, Tooltip } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  type PartitionNode,
  type PartitionScene,
  selectEvent,
} from '@elastic/isomer-primitives-charts/scene';
import { partitionChartExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  act,
  debugStateIn,
  draw,
  legendOf,
  resolvedCases,
  SIZE,
} from '../../shared/render.fixtures';
import { elasticModule } from '../../shared/styles';
import { sceneSpecs } from '../../specs';

import { partitionValueFormatter, slicesOf } from './partition';

const { handles: elastic, vars } = elasticModule;

describe('elastic-charts renderer: partition legend actions', () => {
  const selectable = partitionChartExamples.find(
    ({ name }) => name === 'Selectable, pre-rendered and with provenance'
  )!.node;
  const scene = resolveChart(
    { ...selectable, legend: { ...selectable.legend, visibility: 'visible' } },
    { scheme: 'light', size: SIZE }
  );
  if (scene.kind !== 'partition') {
    throw new Error('expected a partition Scene');
  }

  it('draws Filter for and Filter out on each legend item, raising its slice’s event', async () => {
    expect(scene.legend.items.length).toBeGreaterThan(1);
    for (const item of scene.legend.items) {
      expect(item.selection).toBeDefined();
      for (const negate of [false, true]) {
        const events: ChartEvent[] = [];
        const container = await draw(scene, {
          environment: 'browser',
          nodeId: 'pie',
          onEvent: (raised) => events.push(raised),
        });
        const button = container.querySelector<HTMLButtonElement>(
          `button[aria-label="Filter ${negate ? 'out' : 'for'} ${item.label}"]`
        );
        expect(button, `${item.label}, negate ${negate}`).not.toBeNull();
        act(() => button!.click());
        expect(events).toEqual([selectEvent('pie', item.selection!, negate)]);
      }
    }
  });

  it('offers no legend actions without onEvent', async () => {
    const container = await draw(scene);
    expect(container.querySelector('button[aria-label^="Filter "]')).toBeNull();
  });
});

describe('elastic-charts renderer: partition tooltip', () => {
  const nested = resolveChart(
    partitionChartExamples.find(
      ({ name }) => name === 'Nested pie with values'
    )!.node,
    { scheme: 'light', size: SIZE }
  );
  if (nested.kind !== 'partition') {
    throw new Error('expected a partition Scene');
  }

  /** The `customTooltip` the specs install, shown for the slices of `path`, outermost first, as Elastic Charts reports a hover. */
  const hover = (scene: PartitionScene, path: readonly PartitionNode[]) => {
    const tooltip = React.Children.toArray(
      (
        sceneSpecs(scene, { environment: 'browser' }) as React.ReactElement<{
          children: React.ReactNode;
        }>
      ).props.children
    ).find(
      (child): child is React.ReactElement<{ customTooltip: CustomTooltip }> =>
        React.isValidElement(child) && child.type === Tooltip
    )?.props.customTooltip;
    expect(tooltip, 'an installed custom tooltip').toBeDefined();
    const values = path.map(({ key }) => ({
      seriesIdentifier: { key, specId: 'partition' },
    }));
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(tooltip!, { values } as never)
    );
    return {
      rows: [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((cell) => cell.textContent)
      ),
      colors: [...page.querySelectorAll('.echTooltip__colorStrip[style]')].map(
        (strip) => strip.getAttribute('style')
      ),
    };
  };

  it('lists a nested slice and each slice it sits in, with their values, shares and colors', () => {
    const outer = nested.nodes[0]!;
    const inner = outer.children[0]!;
    expect(inner).toBeDefined();
    const { rows, colors } = hover(nested, [outer, inner]);
    expect(rows).toEqual(
      [outer, inner].map(({ label, valueText, percentText }) => [
        label,
        `${valueText}\u00A0(${percentText})`,
      ])
    );
    expect(colors).toHaveLength(2);
    expect(colors[0]).toContain(outer.color);
    expect(colors[1]).toContain(inner.color);
  });

  it('shows the outermost slice alone when it is hovered', () => {
    const outer = nested.nodes[1]!;
    expect(hover(nested, [outer]).rows).toEqual([
      [outer.label, `${outer.valueText}\u00A0(${outer.percentText})`],
    ]);
  });
});

describe('elastic-charts renderer: resolved partitionChart examples', () => {
  it.each(resolvedCases(partitionChartExamples))(
    '$name',
    async ({ node, scheme }) => {
      const scene = resolveChart(node, { scheme, size: SIZE });
      if (scene.kind !== 'partition') {
        throw new Error('expected a partition Scene');
      }
      if (scene.empty) {
        const container = await draw(scene);
        expect(container.textContent).toBe(scene.empty.text);
        expect(container.querySelector('.echChart')).toBeNull();
        const image = container.querySelector<HTMLElement>('[role="img"]')!;
        // Its note in the Scene's subdued text, on its background, at its size.
        expect(image.classList).toContain(elastic.empty.readableName);
        expect(
          [
            vars.empty.ink,
            vars.empty.fill,
            vars.empty.width,
            vars.empty.height,
          ].map(({ propName }) => image.style.getPropertyValue(propName))
        ).toEqual([
          scene.chrome.textSubdued,
          scene.chrome.background,
          `${SIZE.width}px`,
          `${SIZE.height}px`,
        ]);
        expect(image.getAttribute('aria-label')).toBe(
          scene.title ?? scene.empty.text
        );
        if (scene.title !== undefined) {
          const described = image.getAttribute('aria-describedby');
          expect(
            described && container.ownerDocument.getElementById(described)
          ).toHaveProperty('textContent', scene.empty.text);
        }
        return;
      }
      const container = await draw(scene);
      const state = debugStateIn(container);
      // Elastic Charts names each slice by its key; a waffle reports each square.
      const drawn = [
        ...new Map(
          (state.partition?.[0]?.partitions ?? []).map(
            ({ name, depth, color, value }) => [
              name,
              { key: name, depth, color, value },
            ]
          )
        ).values(),
      ];
      const slices = slicesOf(scene.nodes).map(
        ({ key, depth, color, value }) => ({ key, depth, color, value })
      );
      expect(drawn).toHaveLength(slices.length);
      expect(drawn).toEqual(expect.arrayContaining(slices));
      if (scene.legend.visible) {
        expect(legendOf(container)).toEqual(
          scene.legend.items.map(({ label, value }) => ({
            label,
            value: value ?? '',
          }))
        );
      }
    }
  );
});

describe('elastic-charts renderer: partition order and text', () => {
  const nested = partitionChartExamples.find(
    ({ name }) => name === 'Nested pie with values'
  )!.node;

  it('lays slices out in the Scene’s order, as a nested legend lists them', async () => {
    const scene = resolveChart(nested, { scheme: 'light', size: SIZE });
    expect(legendOf(await draw(scene)).map(({ label }) => label)).toEqual(
      slicesOf(scene.nodes).map(({ label }) => label)
    );
  });

  it('labels each slice with its own value label, and legend values with their value text', () => {
    const scene = resolveChart(nested, { scheme: 'light', size: SIZE });
    const format = partitionValueFormatter(scene);
    slicesOf(scene.nodes).forEach((slice, index) => {
      expect(format(-1 - index)).toBe(slice.valueLabel);
      expect(format(slice.value)).toBe(slice.valueText);
    });
  });

  it('prints no legend value for a sum whose slices read differently', () => {
    const scene = resolveChart(
      {
        type: 'partitionChart',
        shape: 'pie',
        metrics: [{ column: 'size' }, { column: 'count' }],
        data: {
          columns: [
            {
              id: 'size',
              label: 'Size',
              type: 'number',
              role: 'metric',
              format: { kind: 'bytes' },
            },
            { id: 'count', label: 'Count', type: 'number', role: 'metric' },
          ],
          rows: [[1024, 1024]],
        },
      },
      { scheme: 'light', size: SIZE }
    );
    const [size, count] = slicesOf(scene.nodes);
    expect(size!.value).toBe(count!.value);
    expect(size!.valueText).not.toBe(count!.valueText);
    expect(partitionValueFormatter(scene)(1024)).toBe('');
  });

  it('reads legend values only among the slices the legend lists', () => {
    const scene = resolveChart(
      {
        type: 'partitionChart',
        shape: 'pie',
        groups: [{ column: 'g' }, { column: 'h' }],
        metrics: [{ column: 'v' }],
        legend: { values: true },
        data: {
          columns: [
            { id: 'g', label: 'g', type: 'string', role: 'dimension' },
            { id: 'h', label: 'h', type: 'string', role: 'dimension' },
            { id: 'v', label: 'v', type: 'number', role: 'metric' },
          ],
          rows: [
            ['a', 'x', 5],
            ['a', 'y', 0],
          ],
          display: { v: ['five', '0'] },
        },
      },
      { scheme: 'light', size: SIZE }
    );
    if (scene.kind !== 'partition') {
      throw new Error('expected a partition Scene');
    }
    const [parent] = scene.nodes;
    const child = parent!.children.find(({ label }) => label === 'x')!;
    expect(scene.legend.items.map(({ key }) => key)).toEqual([parent!.key]);
    expect(child.value).toBe(parent!.value);
    expect(child.valueText).not.toBe(parent!.valueText);
    expect(partitionValueFormatter(scene)(parent!.value)).toBe(
      parent!.valueText
    );
  });
});
