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
  xyInteractiveScene,
  type XyScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import { describe, expect, it } from 'vitest';

import { seriesOf } from './events';
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
    const { x, y } = xyInteractiveScene.axes;
    const xFormat = specProps(xyInteractiveScene, 'x').tickFormat as (
      value: unknown
    ) => string;
    const yFormat = specProps(xyInteractiveScene, 'y').tickFormat as (
      value: unknown
    ) => string;
    const [category] = xyInteractiveScene.categories;
    expect(xFormat(category!.x)).toBe(
      x.scale === 'ordinal'
        ? category!.label
        : formatAxisValue(xyInteractiveScene, x, category!.x as number)
    );
    expect(yFormat(1234.5)).toBe(
      formatAxisValue(xyInteractiveScene, y!, 1234.5)
    );
  });

  it('builds a metric Scene into its grid', () => {
    expect(
      specIds(sceneSpecs(metricSingleValueScene, { environment: 'browser' }))
    ).toContain('metric');
  });
});
