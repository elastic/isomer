/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  chartFrame,
  chartsPack,
  chartsThemes,
  metricExamples,
  type MetricTile,
  type MetricTrendNode,
} from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { elasticChartsRendererOverrides, metricDatum } from './index';

const example = metricExamples[0]!;
const node = (tile: MetricTile): MetricTrendNode => ({
  type: 'metricTrend',
  title: 'Metric',
  tiles: [tile],
});

describe('Elastic Charts metric adapter', () => {
  it('keeps numeric values for progress instead of substituting a gauge or formatted string', () => {
    const tile: MetricTile = {
      key: 'progress',
      primary: { label: 'Count', value: -15, formatted: '-15 custom' },
      progress: { min: -10, max: 10, direction: 'horizontal' },
    };
    const datum = metricDatum(node(tile), tile, chartsThemes.light);
    expect(datum).toMatchObject({
      value: -15,
      domainMin: -10,
      domainMax: 10,
      progressBarDirection: 'horizontal',
    });
    if (!('valueFormatter' in datum) || !datum.valueFormatter) {
      throw new Error('Missing numeric formatter');
    }
    expect(datum.valueFormatter(-15)).toBe('-15 custom');
    expect(datum.valueFormatter(10)).toBe('10');
    const defaultDirection = metricDatum(
      node({ ...tile, progress: { max: 10 } }),
      { ...tile, progress: { max: 10 } },
      chartsThemes.light
    );
    expect(defaultDirection).toHaveProperty(
      'progressBarDirection',
      'horizontal'
    );
  });
  it('keeps null as explicit missing text, not zero or NaN', () => {
    const tile: MetricTile = {
      key: 'missing',
      primary: { label: 'Count', value: null },
    };
    expect(metricDatum(node(tile), tile, chartsThemes.dark)).toMatchObject({
      value: 'N/A',
    });
  });
  it('adapts primary and secondary names, independent formatting, comparison and static colors', () => {
    expect(
      metricDatum(example, example.tiles[0]!, chartsThemes.light)
    ).toMatchObject({
      value: 110,
      title: 'Requests',
      extra: {
        value: '+10 (+10.00%)',
        label: 'Yesterday',
        icon: '\u2191',
        ariaDescription: 'up: +10 (+10.00%); neutral',
      },
    });
    const tile: MetricTile = {
      key: 'a',
      primary: { label: 'State', value: 'Healthy' },
      secondary: {
        label: 'Owner',
        value: 'SRE',
        labelPosition: 'hidden',
        color: '#0000ff',
      },
    };
    expect(metricDatum(node(tile), tile, chartsThemes.light)).toMatchObject({
      value: 'Healthy',
      extra: { value: 'SRE', badgeColor: '#0000ff' },
    });
    expect(
      metricDatum(node(tile), tile, chartsThemes.light).extra
    ).not.toHaveProperty('label');
  });
  it('applies palette/value paint without mutating primitive definitions or losing collection', () => {
    const runtime = createIsomerRuntime({
      packs: [chartsPack],
      frames: { chart: chartFrame },
      rendererOverrides: elasticChartsRendererOverrides,
    });
    expect(runtime.primitives[0]).not.toBe(chartsPack.primitives[0]);
    const snapshot = runtime.surfaces.snapshot.render({
      type: 'view',
      body: [example],
    });
    expect(snapshot.html).toContain('isomer-metric');
    expect(snapshot.html).toContain('<svg');
    expect(snapshot.css).toContain('.isomer-metric');
    expect(snapshot.html).not.toContain('data-elastic-metric');
    expect(runtime.surfaces.text.renderNode(example)).toContain('gap');
  });
});
