/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { ChartData } from '../schema/core';
import { metricSingleValue } from '../schema/examples/metric';
import { xyTimeSeries } from '../schema/examples/xy_chart';

import { metricSingleValueScene, xyTimeSeriesScene } from './examples';
import type { Scene, SceneRenderer, SceneSource } from './types';

/** Every source a selectable part of the Scene carries. */
const sourcesOf = (scene: Scene): SceneSource[] =>
  scene.kind === 'metric'
    ? scene.tiles.map(({ source }) => source)
    : [
        ...scene.series.flatMap((series) => [
          series.source,
          ...series.marks.map(({ source }) => source),
        ]),
        ...scene.legend.items.map(({ source }) => source),
      ];

const cases: { name: string; scene: Scene; data: ChartData }[] = [
  {
    name: 'metric',
    scene: metricSingleValueScene,
    data: metricSingleValue.data,
  },
  { name: 'xy', scene: xyTimeSeriesScene, data: xyTimeSeries.data },
];

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
      expect(scene.table.columns.map(({ id }) => id)).toEqual(
        data.columns.map(({ id }) => id)
      );
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
