/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { FrameDispatcher, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { chartsFrame } from './frame';
import { createChartsPack } from './pack';
import type { ChartNode, ResolveSceneOptions } from './render/context';
import { metricSingleValueScene } from './scene/examples';
import { CHART_CHROME } from './scene/theme';
import type { Scene } from './scene/types';
import { gridExamples } from './schema/examples/grid';
import type { GridNode } from './schema/grid';

const chart = gridExamples[0]!.node.panels[0]!.node;

describe('chartsFrame', () => {
  const heights = new Map<PrimitiveNode, number>();
  const dispatcher: FrameDispatcher = {
    renderSnapshotNode: () => null,
    estimateSnapshotHeight: (node) => heights.get(node) ?? 0,
  };
  const tall = { type: 'tall' };
  const short = { type: 'short' };
  heights.set(tall, 100).set(short, 50);

  it('is 960 px wide and sized to its content', () => {
    expect(chartsFrame.defaultWidth).toBe(960);
    expect(chartsFrame.sizing).toBe('content');
  });

  it('estimates padding, the header and the nodes, with a 16 px gap between each', () => {
    expect(chartsFrame.estimateHeight({ body: [] }, dispatcher)).toBe(32);
    expect(chartsFrame.estimateHeight({ body: [tall] }, dispatcher)).toBe(132);
    // 16 + title 20 + 16 + subtitle 14 + 16 + 100 + 16 + 50 + 16.
    expect(
      chartsFrame.estimateHeight(
        { title: 'T', subtitle: 'S', body: [tall, short] },
        dispatcher
      )
    ).toBe(264);
  });

  it.each(['light', 'dark'] as const)(
    'draws the title and subtitle on the %s scheme',
    (scheme) => {
      const theme = chartsFrame.theme[scheme];
      expect(theme).toEqual({
        scheme,
        background: CHART_CHROME[scheme].background,
        text: CHART_CHROME[scheme].text,
      });
      const out = renderToStaticMarkup(
        createElement(
          Fragment,
          null,
          chartsFrame.wrap(
            { title: 'Board', subtitle: 'Last 24 hours' },
            [createElement('p', { key: 'body' }, 'Body')],
            { width: 960, height: 0, theme, mode: scheme }
          )
        )
      );
      expect(out).toContain(`background:${theme.background}`);
      expect(out).toContain(`color:${theme.text}`);
      expect(out).toContain('>Board</h1>');
      expect(out).toContain('>Last 24 hours</p>');
      expect(out.indexOf('Last 24 hours')).toBeLessThan(out.indexOf('Body'));
    }
  );

  describe('on snapshot', () => {
    const resolved: ResolveSceneOptions[] = [];
    const resolveScene = (
      _: ChartNode,
      options: ResolveSceneOptions
    ): Scene => {
      resolved.push(options);
      return { ...metricSingleValueScene, scheme: options.scheme };
    };
    const runtime = createIsomerRuntime({
      packs: [createChartsPack({ resolveScene })],
      frames: { charts: chartsFrame },
    });
    const grid: GridNode = {
      type: 'grid',
      panels: [
        { x: 0, y: 0, w: 48, h: 4, node: chart },
        { x: 0, y: 4, w: 24, h: 4, node: chart },
      ],
    };

    it("lays a grid out for the frame's 928 px of content, in its scheme", () => {
      resolved.length = 0;
      const { width, html } = runtime.surfaces.snapshot.render(
        {
          type: 'view',
          title: 'Board',
          subtitle: 'Last 24 hours',
          body: [grid],
        },
        { theme: 'dark' }
      );
      expect(width).toBe(960);
      expect(html).toContain('Last 24 hours');
      // 960 − 2 × 16 padding; half of it is (928 − 47 × 8) × 24/48 + 23 × 8.
      // The style collection pass resolves the same Scenes the drawn page does.
      expect([...new Set(resolved.map(({ size }) => size?.width))]).toEqual([
        928, 460,
      ]);
      expect(new Set(resolved.map(({ scheme }) => scheme))).toEqual(
        new Set(['dark'])
      );
    });

    it('draws a chart on its own in the light scheme by default', () => {
      resolved.length = 0;
      runtime.surfaces.snapshot.render({ type: 'view', body: [chart] });
      expect(resolved.length).toBeGreaterThan(0);
      expect(new Set(resolved.map(({ scheme }) => scheme))).toEqual(
        new Set(['light'])
      );
    });
  });
});
