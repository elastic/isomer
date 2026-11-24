/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DebugState } from '@elastic/charts';
import {
  chartsFrame,
  createChartsPack,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts';
import type { Scene } from '@elastic/isomer-primitives-charts/scene';
import { metricSingleValueScene } from '@elastic/isomer-primitives-charts/scene';
import {
  coverageProblems,
  drawExamples,
  unescapeMarkup,
} from '@elastic/isomer-primitives-charts/testing';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { createElasticChartsNodeRenderer } from './node';
import { debugStateProblems } from './testing';

const renderer = createElasticChartsNodeRenderer({ debugState: true });
const examples = drawExamples([renderer]);
const charts = examples.drawn.filter(({ markup }) =>
  markup.includes('class="echChart"')
);

const debugStateOf = (markup: string): DebugState | undefined => {
  const raw = /data-ech-debug-state="([^"]*)"/.exec(markup)?.[1];
  return raw === undefined
    ? undefined
    : (JSON.parse(unescapeMarkup(raw)) as DebugState);
};

describe('createElasticChartsNodeRenderer', () => {
  it('draws on Node without a DOM', () => {
    expect(typeof document).toBe('undefined');
  });

  it('draws every example of a kind it supports', () => {
    // A gauge's content is checked through its DebugState below.
    expect(
      coverageProblems(examples, (kind) => renderer.supports(kind)).filter(
        (problem) => problem !== 'no content check for gauge Scenes'
      )
    ).toEqual([]);
  });

  it.each(
    charts
      .filter(({ scene }) => scene.kind === 'metric')
      .map((drawing) => [drawing.example, drawing.scheme, drawing])
  )(
    '%s (%s) draws every tile value',
    (_example, _scheme, { scene, markup }) => {
      const tiles = scene.kind === 'metric' ? scene.tiles : [];
      const text = unescapeMarkup(markup);
      expect(
        tiles.map(({ value }) => value.text).filter((v) => !text.includes(v))
      ).toEqual([]);
    }
  );

  it.each(['metric', 'xy', 'partition', 'heatmap', 'gauge'])(
    'draws %s Scenes with Elastic Charts',
    (kind) => {
      expect(charts.some(({ scene }) => scene.kind === kind)).toBe(true);
    }
  );

  it.each(charts.map((drawing) => [drawing.example, drawing.scheme, drawing]))(
    '%s (%s) draws its Scene, as its DebugState reports',
    (_example, _scheme, { scene, markup }) => {
      expect(debugStateProblems(scene, debugStateOf(markup))).toEqual([]);
    }
  );

  it.each(charts.map((drawing) => [drawing.example, drawing.scheme, drawing]))(
    '%s (%s) draws at its Scene size',
    (_example, _scheme, { scene: { size }, markup }) => {
      expect(
        /class="echChart" style="width:(\d+)px;height:(\d+)px"/
          .exec(markup)
          ?.slice(1)
          .map(Number)
      ).toEqual([size?.width, size?.height]);
    }
  );

  const snapshotOf = (body: (typeof xyChartExamples)[number]['node'][]) =>
    createIsomerRuntime({
      packs: [createChartsPack({ sceneRenderers: [renderer] })],
      frames: { charts: chartsFrame },
    }).surfaces.snapshot.render({ type: 'view', body }).html;

  it('keeps the ids of roots with distinct React id prefixes apart', () => {
    const { scene } = identified[0]!;
    const idIn = (identifierPrefix: string) =>
      chartIdOf(
        renderToStaticMarkup(
          createElement(
            'div',
            null,
            renderer.render(scene, { environment: 'node' })
          ),
          { identifierPrefix }
        )
      );
    expect(idIn('panel-1-')).not.toBe(idIn('panel1-'));
  });

  it('draws the same markup for the same page', () => {
    const { node } = xyChartExamples[0]!;
    expect(snapshotOf([node, node])).toBe(snapshotOf([node, node]));
  });

  it('leaves a tag cloud, which `renderChart` cannot draw, to the next renderer', () => {
    expect(renderer.supports('tagCloud')).toBe(false);
    expect(examples.resolved.some(({ kind }) => kind === 'tagCloud')).toBe(
      true
    );
    expect(examples.drawn.some(({ scene }) => scene.kind === 'tagCloud')).toBe(
      false
    );
  });

  it('draws a Scene with nothing to draw as its note, with no chart', () => {
    const empty = examples.drawn.filter(
      ({ markup }) => !charts.some((chart) => chart.markup === markup)
    );
    expect(empty.length).toBeGreaterThan(0);
    expect(
      empty.filter(({ markup }) => !markup.includes('role="img"'))
    ).toEqual([]);
  });

  /** The id a chart's markup carries; a metric draws no `svg`, and carries none. */
  const chartIdOf = (markup: string) =>
    /"(ech-[0-9a-z]+-[0-9A-Za-z]+)--/.exec(markup)?.[1];
  const identified = charts.flatMap(({ scene, markup }) => {
    const id = chartIdOf(markup);
    return id === undefined ? [] : [{ id, scene, markup }];
  });

  it('names each chart by its Scene, so different charts never share ids', () => {
    const scenes = new Map<string, Set<string>>();
    for (const { id, scene } of identified) {
      const named = id.replace(/-[^-]+$/, '');
      scenes.set(
        named,
        (scenes.get(named) ?? new Set()).add(JSON.stringify(scene))
      );
    }
    expect(scenes.size).toBeGreaterThan(1);
    expect([...scenes.values()].filter((same) => same.size > 1)).toEqual([]);
  });

  it('draws two copies of one chart on a snapshot page with their own ids, marks and size', () => {
    const { node } = xyChartExamples[0]!;
    const charts = snapshotOf([node, node]).split('class="echChart"').slice(1);
    expect(charts).toHaveLength(2);
    const ids = charts.map(chartIdOf);
    expect(new Set(ids).size).toBe(2);
    charts.forEach((chart, index) => {
      const other = ids[1 - index]!;
      expect(chart).toContain(`id="${ids[index]}-xy-clip-1"`);
      expect(chart).toContain(`url(#${ids[index]}-xy-clip-1)`);
      expect(chart).not.toContain(other);
      // The line and its axis labels are in the page, at the pack's box.
      expect(chart).toMatch(/^ style="width:\d+px;height:\d+px"/);
      expect(chart).toMatch(/<svg[^>]*class="echCanvasRenderer/);
      expect(chart).toMatch(/<path /);
      expect(chart).toMatch(/<text /);
    });
  });

  it('does not read the Scene’s table, whose rows are formatted on first read', () => {
    const { scene } = charts.find(({ scene: { kind } }) => kind === 'xy')!;
    const lazy: Scene = {
      ...scene,
      table: {
        columns: scene.table.columns,
        get rows(): Scene['table']['rows'] {
          throw new Error('rows were read');
        },
      },
    };
    expect(() => renderer.render(lazy, { environment: 'node' })).not.toThrow();
  });

  it('prefixes every id inside a chart with the chart’s', () => {
    expect(
      identified.flatMap(({ id, markup }) =>
        [...markup.matchAll(/ id="([^"]+)"/g)]
          .map(([, inner]) => inner!)
          .filter((inner) => !inner.includes(id))
      )
    ).toEqual([]);
  });

  it('draws a metric’s secondary text', () => {
    const secondaries = charts.flatMap(({ scene, markup }) =>
      scene.kind === 'metric'
        ? scene.tiles.flatMap(({ secondary }) =>
            secondary ? [{ text: secondary.text, markup }] : []
          )
        : []
    );
    expect(secondaries.length).toBeGreaterThan(0);
    expect(
      secondaries
        .filter(({ text, markup }) => !unescapeMarkup(markup).includes(text))
        .map(({ text }) => text)
    ).toEqual([]);
  });

  it('draws a secondary label placed in a tooltip as text a screen reader reads, with nothing to focus', () => {
    const [tile] = metricSingleValueScene.tiles;
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        renderer.render(
          {
            ...metricSingleValueScene,
            size: { width: 300, height: 160 },
            tiles: [
              {
                ...tile!,
                secondary: {
                  text: '+5%',
                  color: '#ff00ff',
                  label: 'last week',
                  labelPlacement: 'tooltip',
                },
              },
            ],
          },
          { environment: 'node' }
        )
      )
    );
    expect(markup).toContain(
      '<span class="echScreenReaderOnly">last week </span>'
    );
    expect(markup).toContain('+5%');
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain('tabindex');
  });

  it('refuses a Scene with no size, which a `sized` renderer is never given', () => {
    const { size: _size, ...unsized } = charts[0]!.scene;
    expect(() =>
      renderer.render(unsized as Scene, { environment: 'node' })
    ).toThrow(/needs a Scene size/);
  });
});
