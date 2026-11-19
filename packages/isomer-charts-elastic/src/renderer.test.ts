/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  MetricScene,
  XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import { draw, renderer, SIZE } from './shared/render.fixtures';
import { sceneSpecs } from './specs';

describe('elastic-charts renderer', () => {
  it('draws metric, xy, partition, heatmap, gauge and tagCloud in the browser', () => {
    expect(renderer.id).toBe('elastic-charts');
    expect(renderer.environments).toEqual(['browser']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
    expect(renderer.supports('partition')).toBe(true);
    expect(renderer.supports('heatmap')).toBe(true);
    expect(renderer.supports('gauge')).toBe(true);
    expect(renderer.supports('tagCloud')).toBe(true);
    expect(renderer.supports('table')).toBe(false);
    expect(renderer.supports('legacyMetric')).toBe(false);
  });

  it('fills its container, so the chart shim gives it the size spec’s box', () => {
    expect(renderer.fluid).toBe(true);
  });
});

describe('elastic-charts renderer: an xy or metric Scene with nothing to draw', () => {
  const noRows = <Node>(examples: readonly { name: string; node: Node }[]) =>
    examples.find(({ name }) => name === 'No rows')!.node;

  const options = { scheme: 'light' as const, size: SIZE };

  it.each([
    { kind: 'xy', scene: resolveChart(noRows(xyChartExamples), options) },
    { kind: 'metric', scene: resolveChart(noRows(metricExamples), options) },
  ])('draws the $kind Scene’s note, not a chart', async ({ scene }) => {
    const resolved: XyScene | MetricScene = scene;
    expect(resolved.empty?.text).toBe('No results found');
    const empty = { reason: 'noResults' as const, text: 'Nichts gefunden' };
    const container = await draw({ ...resolved, empty });
    expect(container.textContent).toBe('Nichts gefunden');
    expect(container.textContent).not.toContain('No data to display');
    expect(container.querySelector('.echChart')).toBeNull();
    expect(
      container.querySelector('[role="img"]')?.getAttribute('aria-label')
    ).toBe(resolved.title);
    expect(sceneSpecs(resolved, { environment: 'browser' })).toBeNull();
  });
});
