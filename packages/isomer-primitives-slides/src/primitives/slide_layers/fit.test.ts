/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { layoutFindings, noFindings, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { layersFit } from '../../theme/components/layers';
import { tallestExample } from '../slide_heading/examples';
import { paneWidths } from '../slide_split/pane_context';

import { layersLoad, layersStep } from './fit';
import type { SlideLayer, SlideLayersNode } from './schema';

const oneLine = 'Routes, rate-limits, and authenticates every request';
const twoLines = `${oneLine}, then retries the ones that fail with a backoff that doubles each time`;

const stack = (...bodies: string[]): SlideLayersNode => ({
  type: 'slideLayers',
  layers: bodies.map((body, index): SlideLayer => ({
    name: `Layer ${index + 1}`,
    body,
    owner: 'Platform',
  })),
});

const repeat = (count: number, body: string) =>
  Array.from({ length: count }, () => body);

describe('layersLoad', () => {
  it('counts a line per short body and more per wrapping body', () => {
    expect(layersLoad(stack(...repeat(3, oneLine)), 'l')).toBe(3);
    expect(layersLoad(stack(...repeat(3, twoLines)), 'l')).toBe(6);
  });

  it('counts a row per chip layer that fits one', () => {
    const node: SlideLayersNode = {
      type: 'slideLayers',
      layers: [
        { name: 'Apps', chips: ['ios', 'web'], owner: 'Client' },
        ...stack(oneLine, oneLine).layers,
      ],
    };
    expect(layersLoad(node, 'l')).toBe(3);
  });

  it('grows as the band narrows', () => {
    const [half] = paneWidths(frameContentWidth, 'even', 'gap');
    const node = stack(...repeat(3, oneLine));
    expect(layersLoad(node, 'l', half)).toBeGreaterThan(layersLoad(node, 'l'));
  });
});

describe('layersStep', () => {
  it('steps down at each budget, on both sides of it', () => {
    expect(layersStep(stack(...repeat(layersFit.l, oneLine)), {})).toBe('l');
    expect(layersStep(stack(...repeat(layersFit.l + 1, oneLine)), {})).toBe(
      'm'
    );
    expect(layersStep(stack(...repeat(layersFit.m, oneLine)), {})).toBe('m');
    expect(
      layersStep(stack(twoLines, ...repeat(layersFit.m - 1, oneLine)), {})
    ).toBe('s');
  });

  it('keeps an authored size', () => {
    expect(
      layersStep({ ...stack(...repeat(6, twoLines)), size: 'l' }, {})
    ).toBe('l');
  });

  it('steps down under a crowded heading and in a narrower band', () => {
    const node = stack(...repeat(layersFit.l, oneLine));
    expect(layersStep(node, { crowding: 1.1 })).toBe('m');
    expect(
      layersStep(stack(...repeat(layersFit.l + 1, oneLine)), { crowding: 0.8 })
    ).toBe('l');
    const [half] = paneWidths(frameContentWidth, 'even', 'gap');
    expect(layersStep(node, { width: half })).toBe('s');
  });
});

// Under the tallest heading crowding is 1, so each step holds exactly its budget.
describe('layers budgets fit what they allow', () => {
  it.each([
    { step: 'l', node: stack(...repeat(layersFit.l, oneLine)) },
    { step: 'l', node: stack(twoLines, ...repeat(layersFit.l - 2, oneLine)) },
    { step: 'm', node: stack(...repeat(layersFit.m, oneLine)) },
    { step: 'm', node: stack(...repeat(layersFit.m / 2, twoLines)) },
  ] as const)('$node.layers.length layers at $step', async ({ step, node }) => {
    expect(layersStep(node, {})).toBe(step);
    expect(
      await layoutFindings(slideOf(tallestExample, { ...node, size: step }))
    ).toEqual(noFindings);
  });

  it('in half a split', async () => {
    const [width] = paneWidths(frameContentWidth, 'even', 'gap');
    const node = stack(...repeat(layersFit.l, 'Edge cache'));
    expect(layersStep(node, { width })).toBe('l');
    expect(
      await layoutFindings(
        slideOf(tallestExample, {
          type: 'slideSplit',
          panes: [
            { items: [node] },
            { items: [{ type: 'slideBulletList', items: ['One'] }] },
          ],
        })
      )
    ).toEqual(noFindings);
  });
});
