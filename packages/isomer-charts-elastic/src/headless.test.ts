/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CHARTS_THEME,
  createChartsPack,
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts';
import {
  type ColorScheme,
  resolveChart,
  type Scene,
} from '@elastic/isomer-primitives-charts/scene';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import {
  createElasticChartsHeadlessRenderer,
  renderSceneSvg,
} from './headless';

const { chart } = CHARTS_THEME;
const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];

// Each Scene resolves for the box the charts pack gives a chart on Node.
const xyCases = xyChartExamples.flatMap(({ name, node }) =>
  SCHEMES.map((scheme) => ({
    name,
    scheme,
    scene: resolveChart(node, {
      scheme,
      size: { width: chart.width, height: chart.xyHeight },
    }),
  }))
);
const metricCases = metricExamples.flatMap(({ name, node }) =>
  SCHEMES.map((scheme) => {
    const { rows } = resolveChart(node, { scheme }).layout;
    return {
      name,
      scheme,
      scene: resolveChart(node, {
        scheme,
        size: { width: chart.width, height: chart.metricTileHeight * rows },
      }),
    };
  })
);

/** Every string the SVG draws as `<text>`, unescaped. */
const svgTexts = (svg: string): string[] =>
  [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) =>
    text!.replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
  );

// Elastic Charts may break a string across lines, even mid-word, and draws a
// metric value's unit apart from its number, so compare without spaces.
const squash = (text: string) => text.replace(/\s+/g, '');

describe('renderSceneSvg', () => {
  it.each<{ name: string; scheme: ColorScheme; scene: Scene }>([
    ...xyCases,
    ...metricCases,
  ])(
    '$name ($scheme) draws an SVG at the Scene size on its background',
    ({ scene }) => {
      const { svg, width, height } = renderSceneSvg(scene);
      expect({ width, height }).toEqual(scene.size);
      expect(svg).toMatch(/^<svg\b/);
      expect(svg).toContain(`fill="${scene.chrome.background}"`);
    }
  );

  it.each(xyCases)(
    '$name ($scheme) draws its axis titles, and only Scene labels on its axes',
    ({ scene }) => {
      const { svg, debugState } = renderSceneSvg(scene);
      const texts = new Set(svgTexts(svg));
      const axes = [scene.axes.x, scene.axes.y, scene.axes.y2].flatMap(
        (axis) => (axis ? [axis] : [])
      );
      for (const { title } of axes) {
        if (title !== undefined) {
          expect(texts).toContain(title);
        }
      }
      // DebugState lists what Elastic Charts drew on each axis, when the
      // Elastic Charts build returns it from a headless render.
      const sceneLabels = new Set(
        axes.flatMap(({ ticks }) => ticks.map(({ label }) => label))
      );
      const drawn = [
        ...(debugState?.axes?.x ?? []),
        ...(debugState?.axes?.y ?? []),
      ].flatMap(({ labels }) => labels.filter((label) => label !== ''));
      for (const label of drawn) {
        expect(sceneLabels).toContain(label);
        expect(texts).toContain(label);
      }
    }
  );

  it.each(metricCases)(
    '$name ($scheme) draws each tile title and value',
    ({ scene }) => {
      const text = squash(svgTexts(renderSceneSvg(scene).svg).join(''));
      for (const tile of scene.tiles) {
        expect(text).toContain(squash(tile.title));
        expect(text).toContain(squash(tile.value.text));
      }
    }
  );

  it('escapes Scene strings in the SVG', () => {
    const { scene } = xyCases[0]!;
    const title = '<script>alert("x")</script> & co';
    const { svg } = renderSceneSvg({
      ...scene,
      axes: { ...scene.axes, x: { ...scene.axes.x, title } },
    });
    expect(svg).not.toContain('<script>');
    expect(svgTexts(svg)).toContain(title);
  });

  it('refuses a Scene without a size', () => {
    const { size: _size, ...unsized } = xyCases[0]!.scene;
    expect(() => renderSceneSvg(unsized)).toThrow(/needs a size/);
  });
});

describe('createElasticChartsHeadlessRenderer', () => {
  const renderer = createElasticChartsHeadlessRenderer();
  const view = (node: PrimitiveNode): Composition => ({
    type: 'view',
    body: [node],
  });

  it('runs on Node only, for metric and xy', () => {
    expect(renderer.environments).toEqual(['node']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
    expect(renderer.supports('table')).toBe(false);
  });

  it.each([
    ['metric', metricExamples[0]!.node],
    ['xyChart', xyChartExamples[0]!.node],
  ] as const)(
    'draws a %s through the charts pack at its theme box',
    (_, node) => {
      const runtime = createIsomerRuntime({
        packs: [createChartsPack({ sceneRenderers: [renderer] })],
      });
      const html = renderToStaticMarkup(
        createElement(
          'div',
          null,
          runtime.surfaces.react.render(view(node), { heading: false })
        )
      );
      expect(html).toMatch(new RegExp(`<svg[^>]* width="${chart.width}"`));
    }
  );
});
