/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import { formatAxisValue } from '@elastic/isomer-primitives-charts/scene';
import { gaugeExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  debugStateIn,
  draw,
  resolvedCases,
  SIZE,
} from '../shared/render.fixtures';

import {
  gaugeColorBands,
  gaugeTargetFormatter,
  gaugeValueFormatter,
} from './gauge';

describe('elastic-charts renderer: resolved gauge examples', () => {
  it.each(resolvedCases(gaugeExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'gauge') {
      throw new Error('expected a gauge Scene');
    }
    const container = await draw(scene);
    if (scene.empty) {
      expect(container.textContent).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    const [drawn] = debugStateIn(container).bullet?.rows?.[0] ?? [];
    expect(drawn).toMatchObject({
      title: scene.labels.major,
      value: scene.value,
      domain: [scene.min, scene.max],
    });
    expect(drawn?.target).toBe(scene.goal?.value);
    if (scene.ticks) {
      expect(drawn?.ticks).toEqual(scene.ticks);
    }
  });
});

describe('elastic-charts renderer: gauge text and bands', () => {
  const scene = resolveChart(gaugeExamples[0]!.node, {
    scheme: 'light',
    size: SIZE,
  });
  if (scene.kind !== 'gauge') {
    throw new Error('expected a gauge Scene');
  }

  it('writes the value and goal as the Scene does, and any other value as the scale prints it', () => {
    const value = gaugeValueFormatter(scene);
    const target = gaugeTargetFormatter(scene);
    expect(value(scene.value!)).toBe(scene.valueText);
    expect(target(scene.goal!.value)).toBe(scene.goal!.text);
    expect(value(50)).toBe(formatAxisValue(scene, scene, 50));
    expect(target(50)).toBe(formatAxisValue(scene, scene, 50));
  });

  it('writes a goal the value reaches in its own text', () => {
    const reached = {
      ...scene,
      goal: { value: scene.value!, text: 'Goal text' },
    };
    expect(gaugeTargetFormatter(reached)(scene.value!)).toBe('Goal text');
    expect(gaugeValueFormatter(reached)(scene.value!)).toBe(scene.valueText);
  });

  it('passes each band’s edges and color, and a lone band as one color', () => {
    expect(gaugeColorBands(scene)).toEqual({
      steps: [0, 60, 85, 100],
      colors: scene.bands.map(({ color }) => color),
    });
    const lone = { ...scene, bands: [scene.bands[0]!] };
    expect(gaugeColorBands(lone)).toEqual([
      scene.bands[0]!.color,
      scene.bands[0]!.color,
    ]);
  });
});
