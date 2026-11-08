/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Children, isValidElement, type ReactNode } from 'react';
import {
  formatAxisValue,
  metricSingleValueScene,
  type Scene,
  xyInteractiveScene,
  type XyScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import { describe, expect, it } from 'vitest';

import { seriesOf } from './events';
import { metricDatum } from './metric';
import { sceneSpecs } from './specs';

const specElements = (specs: ReactNode) => {
  const fragment = specs as { props: { children: ReactNode } };
  return Children.toArray(fragment.props.children).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child) ? [child.props] : []
  );
};

/** The `id` of every spec element, in the order `sceneSpecs` returns them. */
const specIds = (specs: ReactNode): string[] =>
  specElements(specs).flatMap(({ id }) => (typeof id === 'string' ? [id] : []));

/** The props of the spec element with this `id`. */
const specProps = (scene: XyScene, id: string): Record<string, unknown> => {
  const props = specElements(
    sceneSpecs(scene, { environment: 'browser' })
  ).find((element) => element.id === id);
  expect(props).toBeDefined();
  return props!;
};

describe('sceneSpecs', () => {
  it('draws xy layers in the Scene order, each kind keeping its own index', () => {
    const [first, second, third] = seriesOf(xyInteractiveScene);
    const scene: XyScene = {
      ...xyInteractiveScene,
      layers: [
        { kind: 'series', series: first! },
        {
          kind: 'referenceLine',
          line: {
            axis: 'y',
            value: 100,
            color: '#ff0000',
            strokeWidth: 1,
            strokeDash: 'solid',
            textPosition: 'auto',
          },
        },
        { kind: 'series', series: second! },
        {
          kind: 'annotation',
          annotation: {
            kind: 'point',
            at: 0,
            color: '#00ff00',
            tooltip: { entries: [] },
          },
        },
        { kind: 'series', series: third! },
      ],
    };
    expect(
      specIds(sceneSpecs(scene, { environment: 'browser' })).filter((id) =>
        /^(series|reference|annotation)-/.test(id)
      )
    ).toEqual([
      'series-0',
      'reference-0',
      'series-1',
      'annotation-0',
      'series-2',
    ]);
  });

  it('hands Elastic Charts each axis domain as intent, as Kibana does', () => {
    const scene: XyScene = {
      ...xyInteractiveScene,
      axes: {
        ...xyInteractiveScene.axes,
        y2: {
          ...xyInteractiveScene.axes.y!,
          id: 'y2',
          position: 'right',
          domain: { kind: 'custom', min: -5, max: 5 },
        },
      },
    };
    expect(specProps(scene, 'y').domain).toEqual({
      min: Number.NaN,
      max: Number.NaN,
      fit: false,
      includeDataFromIds: [],
    });
    expect(specProps(scene, 'y2').domain).toEqual({ min: -5, max: 5 });
    const fitted: XyScene = {
      ...scene,
      axes: {
        ...scene.axes,
        y: {
          ...scene.axes.y!,
          domain: { kind: 'data', includeZero: false, rounding: false },
        },
      },
    };
    expect(specProps(fitted, 'y').domain).toMatchObject({ fit: true });
    expect(specProps(fitted, 'series-0')).toMatchObject({ yNice: false });
    expect(specProps(scene, 'series-0')).toMatchObject({ yNice: true });
  });

  it('hands Elastic Charts the x domain bounds and bucket interval', () => {
    const xDomain = (scene: XyScene) =>
      specElements(sceneSpecs(scene, { environment: 'browser' })).find(
        (element) => 'baseTheme' in element
      )?.xDomain;
    const withX = (x: Partial<XyScene['axes']['x']>): XyScene => ({
      ...xyTimeSeriesScene,
      axes: {
        ...xyTimeSeriesScene.axes,
        x: { ...xyTimeSeriesScene.axes.x, ...x },
      },
    });
    expect(xDomain(xyTimeSeriesScene)).toBeUndefined();
    expect(xDomain(withX({ interval: 3_600_000 }))).toEqual({
      min: Number.NaN,
      max: Number.NaN,
      minInterval: 3_600_000,
    });
    expect(
      xDomain(
        withX({
          interval: 60_000,
          domain: { kind: 'custom', min: 0, max: 600_000 },
        })
      )
    ).toEqual({ min: 0, max: 600_000, minInterval: 60_000 });
  });

  it('includes a reference line in its axis data domain', () => {
    const scene: XyScene = {
      ...xyInteractiveScene,
      layers: [
        ...xyInteractiveScene.layers,
        {
          kind: 'referenceLine',
          line: {
            axis: 'y',
            value: 1000,
            color: '#ff0000',
            strokeWidth: 1,
            strokeDash: 'solid',
            textPosition: 'auto',
          },
        },
      ],
    };
    expect(specProps(scene, 'y').domain).toMatchObject({
      includeDataFromIds: ['reference-0'],
    });
  });

  it('lets Elastic Charts stack unstacked values, as a percentage when asked', () => {
    const [first] = seriesOf(xyInteractiveScene);
    const percentage: XyScene = {
      ...xyInteractiveScene,
      layers: xyInteractiveScene.layers.map((layer) =>
        layer.kind === 'series'
          ? {
              ...layer,
              series: {
                ...layer.series,
                stack: { group: 'y', mode: 'percentage' },
              },
            }
          : layer
      ),
    };
    expect(specProps(xyInteractiveScene, 'series-0')).toMatchObject({
      stackAccessors: ['x'],
      data: first!.marks.map(({ x, y }, mark) => ({
        x,
        y,
        series: 0,
        mark,
      })),
    });
    expect(specProps(xyInteractiveScene, 'series-0').stackMode).toBe(undefined);
    expect(specProps(percentage, 'series-0')).toMatchObject({
      stackMode: 'percentage',
    });
  });

  it('labels a percentage stack’s values by their share, through the y axis', () => {
    const scene: XyScene = {
      ...xyInteractiveScene,
      layers: xyInteractiveScene.layers.map((layer) =>
        layer.kind === 'series'
          ? {
              ...layer,
              series: {
                ...layer.series,
                stack: { group: 'y', mode: 'percentage' },
                valueLabels: true,
              },
            }
          : layer
      ),
    };
    const { displayValueSettings } = specProps(scene, 'series-0') as {
      displayValueSettings: { valueFormatter: (value: unknown) => string };
    };
    const label = displayValueSettings.valueFormatter(0.25);
    expect(label).not.toBe('');
    expect(label).toBe(formatAxisValue(scene, scene.axes.y!, 0.25));
  });

  it('labels each value by its mark, and no value whose marks disagree', () => {
    const [series] = seriesOf(xyInteractiveScene);
    const mark = series!.marks[0]!;
    const scene: XyScene = {
      ...xyInteractiveScene,
      layers: xyInteractiveScene.layers.map((layer) =>
        layer.kind === 'series' && layer.series === series
          ? {
              ...layer,
              series: {
                ...series,
                valueLabels: true,
                marks: [
                  { ...mark, y: 10, label: 'ten (a)' },
                  { ...mark, y: 10, label: 'ten (b)' },
                  { ...mark, y: 20, label: 'twenty' },
                  { ...mark, y: 20, label: 'twenty' },
                  { ...mark, y: 30, label: 'thirty' },
                ],
              },
            }
          : layer
      ),
    };
    const { displayValueSettings } = specProps(scene, 'series-0') as {
      displayValueSettings: { valueFormatter: (value: unknown) => string };
    };
    expect([10, 20, 30].map(displayValueSettings.valueFormatter)).toEqual([
      '',
      'twenty',
      'thirty',
    ]);
  });

  it.each([
    { kind: 'xy', scene: xyInteractiveScene },
    { kind: 'metric', scene: metricSingleValueScene },
  ] as const)(
    '$kind: describes the chart by its summary, then its authored description',
    ({ scene }) => {
      const settings = (described: Scene) =>
        specElements(sceneSpecs(described, { environment: 'browser' })).find(
          (element) => 'ariaDescription' in element
        )?.ariaDescription;
      expect(settings(scene)).toBe(scene.summary);
      expect(settings({ ...scene, description: 'Spikes are deploys.' })).toBe(
        `${scene.summary} Spikes are deploys.`
      );
    }
  );

  it('draws a range annotation outside the plot when its fill is outside', () => {
    const band = (fill: 'inside' | 'outside'): XyScene => ({
      ...xyInteractiveScene,
      layers: [
        {
          kind: 'annotation',
          annotation: {
            kind: 'range',
            from: 0,
            to: 1,
            color: '#00ff00',
            fill,
            tooltip: { entries: [] },
          },
        },
      ],
    });
    expect(specProps(band('outside'), 'annotation-0')).toMatchObject({
      outside: true,
    });
    expect(specProps(band('inside'), 'annotation-0').outside).toBe(undefined);
  });

  it.each([
    ['auto', 'auto'],
    ['visible', 'always'],
    ['hidden', 'never'],
  ] as const)('draws %s points as Elastic Charts %s', (points, visible) => {
    const series = seriesOf(xyTimeSeriesScene)[0]!;
    const scene: XyScene = {
      ...xyTimeSeriesScene,
      layers: [{ kind: 'series', series: { ...series, points } }],
    };
    expect(specProps(scene, 'series-0')).toMatchObject({
      lineSeriesStyle: { point: { visible } },
    });
  });

  it('labels value ticks through formatAxisValue and categories by their label', () => {
    const { y } = xyInteractiveScene.axes;
    const yFormat = specProps(xyInteractiveScene, 'y').tickFormat as (
      value: unknown
    ) => string;
    expect(yFormat(1234.5)).toBe(
      formatAxisValue(xyInteractiveScene, y!, 1234.5)
    );
    const { domain: _domain, ...x } = xyInteractiveScene.axes.x;
    const ordinal: XyScene = {
      ...xyInteractiveScene,
      axes: { ...xyInteractiveScene.axes, x: { ...x, scale: 'ordinal' } },
      categories: xyInteractiveScene.categories.map((category, index) => ({
        ...category,
        x: `c${index}`,
        label: `Category ${index}`,
      })),
    };
    const xFormat = specProps(ordinal, 'x').tickFormat as (
      value: unknown
    ) => string;
    expect(xFormat('c0')).toBe('Category 0');
    expect(xFormat('unknown')).toBe('unknown');
  });

  it('hands Elastic Charts the comparison badge glyph as its icon', () => {
    const [tile] = metricSingleValueScene.tiles;
    const badged = {
      ...tile!,
      secondary: {
        labelPlacement: 'before' as const,
        text: '+5%',
        color: '#000000',
        badge: {
          direction: 'increase' as const,
          color: '#00ff00',
          showIcon: true,
          icon: '↑',
        },
      },
    };
    expect(metricDatum(badged).extra).toMatchObject({
      value: '+5%',
      icon: '↑',
    });
  });

  it('builds a metric Scene into its grid', () => {
    expect(
      specIds(sceneSpecs(metricSingleValueScene, { environment: 'browser' }))
    ).toContain('metric');
  });
});
