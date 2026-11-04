/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  metricSingleValueScene,
  xyInteractiveScene,
} from '@elastic/isomer-primitives-charts/scene';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createElasticChartsNodeRenderer,
  type ElasticChartsNodeRenderer,
} from './renderer';

let renderer: ElasticChartsNodeRenderer;

beforeAll(async () => {
  renderer = await createElasticChartsNodeRenderer({ pixelRatio: 1 });
}, 60_000);

afterAll(async () => {
  await renderer.close();
});

describe('createElasticChartsNodeRenderer', () => {
  it('declares the Node environment and the kinds it draws', () => {
    expect(renderer.id).toBe('elastic-charts-node');
    expect(renderer.environments).toEqual(['node']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
  });

  it('draws on its worker thread, leaving this thread without a DOM', async () => {
    const drawing = await renderer.render(xyInteractiveScene, {
      environment: 'node',
    });
    expect(drawing.html).toContain('data:image/png;base64,');
    expect('document' in globalThis).toBe(false);
  });

  it('draws one Scene after another, each in order', async () => {
    const [xy, metric] = await Promise.all([
      renderer.draw(xyInteractiveScene, { debugState: true }),
      renderer.draw(metricSingleValueScene),
    ]);
    expect(xy.debugState).toBeDefined();
    expect(metric.html).toContain(metricSingleValueScene.tiles[0]!.value.text);
  });

  it('rejects a drawing that fails, and keeps drawing', async () => {
    const { size: _size, ...unsized } = xyInteractiveScene;
    await expect(renderer.draw(unsized)).rejects.toThrow(/needs a size/);
    await expect(renderer.draw(xyInteractiveScene)).resolves.toHaveProperty(
      'width',
      480
    );
  });

  it('rejects drawings once closed', async () => {
    const closing = await createElasticChartsNodeRenderer();
    await closing.close();
    await expect(closing.draw(xyInteractiveScene)).rejects.toThrow(/closed/);
  }, 60_000);
});
