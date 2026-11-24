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
import { examples as gridExamples } from './primitives/grid/examples';
import type { GridNode } from './primitives/grid/schema';
import type { ChartNode, ReactSceneRenderer } from './render/context';
import type { ResolveChartOptions } from './resolve/common';
import { metricSingleValueScene, xyTimeSeriesScene } from './scene/examples';
import type { Scene } from './scene/types';
import { CHART_CHROME } from './theme/palette';

const chart = gridExamples[0]!.node.panels[0]!.node;

// Draws the box its Scene was resolved for, so a test reads what reaches the renderer.
const measuring: ReactSceneRenderer = {
  id: 'measuring',
  environments: ['node'],
  supports: () => true,
  render: ({ size }) =>
    createElement('output', {
      'data-width': size?.width,
      'data-height': size?.height,
    }),
};
const drawnSizes = (html: string) =>
  [...html.matchAll(/<output data-width="(\d+)" data-height="(\d+)"/g)].map(
    ([, width, height]) => ({ width: Number(width), height: Number(height) })
  );
const drawnWidths = (html: string) => [
  ...new Set(drawnSizes(html).map(({ width }) => width)),
];

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
    const resolved: ResolveChartOptions[] = [];
    const resolveScene = (
      _: ChartNode,
      options: ResolveChartOptions
    ): Scene => {
      resolved.push(options);
      return {
        ...metricSingleValueScene,
        scheme: options.scheme,
        ...(options.size && { size: options.size }),
      };
    };
    const runtime = createIsomerRuntime({
      packs: [createChartsPack({ resolveScene, sceneRenderers: [measuring] })],
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
      expect(drawnWidths(html)).toEqual([928, 460]);
      expect(new Set(resolved.map(({ scheme }) => scheme))).toEqual(
        new Set(['dark'])
      );
    });

    it('lays a grid out for the content of the width a render asks for', () => {
      resolved.length = 0;
      const wide = runtime.surfaces.snapshot.render(
        { type: 'view', body: [grid] },
        { width: 1532 }
      );
      // 1532 − 2 × 16 padding; half of it is (1500 − 47 × 8) × 24/48 + 23 × 8.
      expect([...new Set(resolved.map(({ size }) => size?.width))]).toEqual([
        1500, 746,
      ]);
      expect(drawnWidths(wide.html)).toEqual([1500, 746]);
      expect(wide.html).toContain('chartsGrid-panels');
    });

    const sideBySide: GridNode = {
      type: 'grid',
      panels: [
        { x: 0, y: 0, w: 24, h: 4, node: chart },
        { x: 24, y: 0, w: 24, h: 4, node: chart },
      ],
    };

    it('stacks a grid in one column, and measures it so, on a page whose content is under 768 px', () => {
      resolved.length = 0;
      const { snapshot } = runtime.surfaces;
      const narrow = snapshot.render(
        { type: 'view', body: [sideBySide] },
        { width: 600 }
      );
      expect([...new Set(resolved.map(({ size }) => size?.width))]).toEqual([
        568,
      ]);
      expect(drawnWidths(narrow.html)).toEqual([568]);
      expect(narrow.html).toContain('chartsGrid-column');
      // Padding 2 × 16; one row of 4 units is 4 × 20 + 3 × 8 = 104, and stacked the two are 104 + 8 + 104.
      expect(narrow.height).toBe(32 + 104 + 8 + 104);
      expect(snapshot.render({ type: 'view', body: [sideBySide] }).height).toBe(
        32 + 104
      );
    });

    it('keeps a nested grid on its columns in a panel under 768 px, as its panel reserves', () => {
      const nested: GridNode = {
        type: 'grid',
        panels: [{ x: 0, y: 0, w: 24, h: 8, node: sideBySide }],
      };
      const { html } = runtime.surfaces.snapshot.render({
        type: 'view',
        body: [nested],
      });
      // The outer panel is 460 px wide; only the page's width stacks a grid.
      expect(html.split('chartsGrid-panels').length - 1).toBe(2);
      expect(html).not.toContain('chartsGrid-column');
    });

    it('gives a page narrower than its padding no negative width', () => {
      expect(chartsFrame.contentWidth?.(20)).toBe(0);
      resolved.length = 0;
      const { html } = runtime.surfaces.snapshot.render(
        { type: 'view', body: [sideBySide] },
        { width: 20 }
      );
      expect([...new Set(resolved.map(({ size }) => size?.width))]).toEqual([
        0,
      ]);
      expect(drawnWidths(html)).toEqual([0]);
    });

    it('draws a bare grid for the whole page, with no padding to leave', () => {
      resolved.length = 0;
      const { html } = runtime.surfaces.snapshot.renderNode(grid);
      // (960 − 47 × 8) × 24/48 + 23 × 8 for the half-width panel.
      expect([...new Set(resolved.map(({ size }) => size?.width))]).toEqual([
        960, 476,
      ]);
      expect(drawnWidths(html)).toEqual([960, 476]);
    });

    it('lays an html render out for its `width`, with the rules that layout draws', () => {
      const composition = { type: 'view' as const, body: [sideBySide] };
      const { html } = runtime.surfaces;
      const narrow = html.render(composition, { width: 600, css: 'separate' });
      expect(narrow.html).toContain('chartsGrid-column');
      expect(narrow.css).toContain('.chartsGrid-column');
      const unstated = html.render(composition, { css: 'separate' });
      expect(unstated.html).toContain('chartsGrid-panels');
      expect(unstated.css).not.toContain('.chartsGrid-column');
    });

    describe('a chart on its own', () => {
      const sizes: ResolveChartOptions['size'][] = [];
      const { snapshot } = createIsomerRuntime({
        packs: [
          createChartsPack({
            resolveScene: (_, { size, scheme }) => {
              sizes.push(size);
              return { ...scenes.current, scheme, ...(size && { size }) };
            },
            sceneRenderers: [measuring],
          }),
        ],
        frames: { charts: chartsFrame },
      }).surfaces;
      const scenes: { current: Scene } = { current: xyTimeSeriesScene };
      const boxes = () => sizes.filter((size) => size !== undefined);
      const view = { type: 'view' as const, body: [chart] };

      it.each([
        // 928 × 9/16.
        [{}, { width: 928, height: 522 }],
        // 568 × 9/16 = 319.5.
        [{ width: 600 }, { width: 568, height: 320 }],
        // 368 × 9/16 = 207, under a vertical time chart's least height.
        [{ width: 400 }, { width: 368, height: 300 }],
      ])(
        "takes its size spec at the page's content width (%j)",
        (options, box) => {
          sizes.length = 0;
          scenes.current = xyTimeSeriesScene;
          const { height, html } = snapshot.render(view, options);
          expect(boxes()).toEqual([box]);
          expect(drawnSizes(html)).toEqual([box]);
          expect(height).toBe(32 + box.height);
        }
      );

      it("stays within its spec's greatest width", () => {
        sizes.length = 0;
        scenes.current = metricSingleValueScene;
        const { height, html } = snapshot.render(view);
        expect(boxes()).toEqual([{ width: 300, height: 160 }]);
        expect(drawnSizes(html)).toEqual([{ width: 300, height: 160 }]);
        expect(height).toBe(32 + 160);
      });

      it('takes the whole page with no surround', () => {
        sizes.length = 0;
        scenes.current = xyTimeSeriesScene;
        const { height, html } = snapshot.renderNode(chart);
        expect(boxes()).toEqual([{ width: 960, height: 540 }]);
        expect(drawnSizes(html)).toEqual([{ width: 960, height: 540 }]);
        // The reported height is the frame's estimate, padding included.
        expect(height).toBe(32 + 540);
      });
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
