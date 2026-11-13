/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { ChartData } from '../schema/data';
import { metricSingleValue } from '../schema/examples/metric';
import { xyInteractive, xyTimeSeries } from '../schema/examples/xy_chart';

import {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from './examples';
import type {
  PartitionNode,
  Scene,
  SceneRenderer,
  SceneSelection,
  SceneSource,
  XyScene,
} from './types';

/** Every slice of a partition Scene, depth first. */
const slicesOf = (nodes: readonly PartitionNode[]): PartitionNode[] =>
  nodes.flatMap((node) => [node, ...slicesOf(node.children)]);

/** Every source a selectable part of the Scene carries. */
const sourcesOf = (scene: Scene): SceneSource[] =>
  scene.kind === 'metric' || scene.kind === 'legacyMetric'
    ? scene.tiles.map(({ source }) => source)
    : scene.kind === 'table'
      ? scene.rows.flatMap(({ cells }) => cells.map(({ source }) => source))
      : scene.kind === 'partition'
        ? slicesOf(scene.nodes).map(({ source }) => source)
        : scene.kind === 'heatmap'
          ? scene.cells.map(({ source }) => source)
          : scene.kind === 'gauge'
            ? []
            : scene.kind === 'tagCloud'
              ? scene.words.map(({ source }) => source)
              : [
                  ...scene.layers.flatMap((layer) =>
                    layer.kind === 'series'
                      ? [
                          layer.series.source,
                          ...layer.series.marks.map(({ source }) => source),
                        ]
                      : []
                  ),
                  ...scene.legend.items.map(({ source }) => source),
                ];

const cases: { name: string; scene: Scene; data: ChartData }[] = [
  {
    name: 'metric',
    scene: metricSingleValueScene,
    data: metricSingleValue.data,
  },
  { name: 'xy', scene: xyTimeSeriesScene, data: xyTimeSeries.data },
  {
    name: 'interactive xy',
    scene: xyInteractiveScene,
    data: xyInteractive.data,
  },
];

/** Every selection the Scene offers. */
const selectionsOf = (scene: Scene): SceneSelection[] =>
  (scene.kind === 'metric' || scene.kind === 'legacyMetric'
    ? scene.tiles.map(({ selection }) => selection)
    : scene.kind === 'table'
      ? scene.rows.flatMap(({ cells }) =>
          cells.map(({ selection }) => selection)
        )
      : scene.kind === 'partition'
        ? [
            ...slicesOf(scene.nodes).map(({ selection }) => selection),
            ...scene.legend.items.map(({ selection }) => selection),
          ]
        : scene.kind === 'heatmap'
          ? scene.cells.map(({ selection }) => selection)
          : scene.kind === 'gauge'
            ? []
            : scene.kind === 'tagCloud'
              ? scene.words.map(({ selection }) => selection)
              : [
                  ...scene.categories.map(({ selection }) => selection),
                  ...scene.layers.flatMap((layer) =>
                    layer.kind === 'series'
                      ? [
                          layer.series.selection,
                          ...layer.series.marks.map(
                            ({ selection }) => selection
                          ),
                        ]
                      : []
                  ),
                  ...scene.legend.items.map(({ selection }) => selection),
                ]
  ).filter((selection) => selection !== undefined);

describe('Scene examples', () => {
  it.each(cases)(
    '$name: every source names rows and columns of the node data',
    ({ scene, data }) => {
      const ids = new Set(data.columns.map(({ id }) => id));
      const sources = sourcesOf(scene);
      expect(sources.length).toBeGreaterThan(0);
      for (const { rows, columns } of sources) {
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(row).toBeGreaterThanOrEqual(0);
          expect(row).toBeLessThan(data.rows.length);
        }
        for (const column of columns) {
          expect(ids.has(column)).toBe(true);
        }
      }
    }
  );

  it.each(cases)(
    '$name: the table has one row per data row, in data order',
    ({ scene, data }) => {
      expect(scene.table.rows.map(({ row }) => row)).toEqual(
        data.rows.map((_, index) => index)
      );
      expect(scene.table.rows.map(({ values }) => values)).toEqual(data.rows);
      expect(scene.table.columns.map(({ id }) => id)).toEqual(
        data.columns.map(({ id }) => id)
      );
    }
  );
  it('keeps series identity on the series and its legend item', () => {
    const series = xyTimeSeriesScene.layers.flatMap((layer) =>
      layer.kind === 'series' ? [layer.series.series] : []
    );
    const legend = xyTimeSeriesScene.legend.items.map(({ series }) => series);

    expect(series).toEqual([{ layer: 0, y: 0 }]);
    expect(legend).toEqual(series);
  });

  it.each(cases)(
    '$name: a selection names dimension columns every selected row shares',
    ({ scene, data }) => {
      const dimensions = new Set(
        data.columns
          .filter(({ role }) => role === 'dimension')
          .map(({ id }) => id)
      );
      const index = new Map(data.columns.map(({ id }, at) => [id, at]));
      for (const selection of selectionsOf(scene)) {
        expect(scene.interactions.select).toContain(selection.target);
        expect(Object.keys(selection.values).sort()).toEqual(
          [...selection.columns].sort()
        );
        for (const column of selection.columns) {
          expect(dimensions.has(column)).toBe(true);
          for (const row of selection.rows) {
            expect(data.rows[row]?.[index.get(column)!]).toEqual(
              selection.values[column]
            );
          }
        }
      }
    }
  );
});

describe('SceneRenderer', () => {
  it('draws whatever kinds it declares', () => {
    const renderer: SceneRenderer<string> = {
      id: 'test',
      environments: ['node'],
      supports: (kind) => kind === 'metric',
      render: (scene) => scene.summary,
    };
    expect(renderer.supports('xy')).toBe(false);
    expect(
      renderer.render(metricSingleValueScene, { environment: 'node' })
    ).toBe(metricSingleValueScene.summary);
  });
});

describe('XyScene layers', () => {
  it('preserves draw order across series and helper marks', () => {
    const seriesLayer = xyTimeSeriesScene.layers.find(
      (layer) => layer.kind === 'series'
    );
    if (!seriesLayer) {
      throw new Error(
        'The xy time series example must include a series layer.'
      );
    }

    const scene = {
      ...xyTimeSeriesScene,
      layers: [
        {
          kind: 'referenceLine' as const,
          line: {
            axis: 'y' as const,
            value: 100,
            color: '#384861',
            strokeWidth: 1,
            strokeDash: 'solid' as const,
            textPosition: 'auto' as const,
          },
        },
        seriesLayer,
        {
          kind: 'annotation' as const,
          annotation: {
            kind: 'point' as const,
            at: 0,
            color: '#384861',
            tooltip: { entries: [] },
          },
        },
      ],
    } satisfies XyScene;

    expect(scene.layers.map(({ kind }) => kind)).toEqual([
      'referenceLine',
      'series',
      'annotation',
    ]);
  });
});
