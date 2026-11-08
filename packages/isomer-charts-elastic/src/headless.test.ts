/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  chartSize,
  chartSizeSpec,
  createChartsPack,
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ColorScheme,
  formatAxisValue,
  type Scene,
  type SceneAxis,
  type SceneSize,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import {
  createElasticChartsHeadlessRenderer,
  renderSceneSvg,
} from './headless';

const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];

// Each Scene resolves for its size spec's box, as the charts pack sizes a chart on Node.
const sized = <TScene extends Scene>(resolve: (size?: SceneSize) => TScene) =>
  resolve(chartSize(chartSizeSpec(resolve())!));

const xyCases = xyChartExamples.flatMap(({ name, node }) =>
  SCHEMES.map((scheme) => ({
    name,
    scheme,
    scene: sized((size) =>
      resolveChart(node, { scheme, ...(size && { size }) })
    ),
  }))
);
const metricCases = metricExamples.flatMap(({ name, node }) =>
  SCHEMES.map((scheme) => ({
    name,
    scheme,
    scene: sized((size) =>
      resolveChart(node, { scheme, ...(size && { size }) })
    ),
  }))
);

const unescapeXml = (text: string): string =>
  text.replace(/&#(\d+);/g, (_, code: string) =>
    String.fromCharCode(Number(code))
  );

/** Every string the SVG draws as `<text>`, unescaped. */
const svgTexts = (svg: string): string[] =>
  [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) =>
    unescapeXml(text!)
  );

// Elastic Charts may break a string across lines, even mid-word, and draws a
// metric value's unit apart from its number, so compare without spaces.
const squash = (text: string) => text.replace(/\s+/g, '');

/** A drawn tick's expected label: its category's label, or the value through `formatAxisValue`. */
const sceneLabel = (scene: XyScene, axis: SceneAxis, value: unknown) =>
  (axis.scale === 'ordinal'
    ? scene.categories.find(({ x }) => x === value)?.label
    : undefined) ?? formatAxisValue(scene, axis, value as number);

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
      // DebugState lists what Elastic Charts drew on each axis.
      expect(debugState).toBeDefined();
      const drawn = [
        ...(debugState?.axes?.x ?? []).map(
          (state) => [scene.axes.x, state] as const
        ),
        ...(debugState?.axes?.y ?? []).map(
          (state) => [scene.axes[state.id as 'y' | 'y2'], state] as const
        ),
      ];
      expect(drawn.length).toBeGreaterThan(0);
      let checked = 0;
      for (const [axis, { labels, values }] of drawn) {
        expect(axis).toBeDefined();
        labels.forEach((label, index) => {
          if (label !== '') {
            expect(label).toBe(sceneLabel(scene, axis!, values[index]));
            expect(texts).toContain(label);
            checked += 1;
          }
        });
      }
      expect(checked).toBeGreaterThan(0);
    }
  );

  it.each<{ name: string; scheme: ColorScheme; scene: Scene }>([
    ...xyCases,
    ...metricCases,
  ])('$name ($scheme) names the SVG by its title and summary', ({ scene }) => {
    const { svg } = renderSceneSvg(scene);
    const [, open, title, desc] =
      /^(<svg\b[^>]*>)(?:<title>([^<]*)<\/title>)?<desc>([^<]*)<\/desc>/.exec(
        svg
      ) ?? [];
    expect(open).toContain(' role="img"');
    expect(title && unescapeXml(title)).toBe(scene.title);
    expect(desc && unescapeXml(desc)).toBe(scene.summary);
  });

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
    const { svg: named } = renderSceneSvg({ ...scene, title, summary: title });
    expect(named).not.toContain('<script>');
    const [, drawnTitle] = /<title>([^<]*)<\/title>/.exec(named) ?? [];
    expect(unescapeXml(drawnTitle!)).toBe(title);
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

  it('runs on Node unless told otherwise, draws a fixed size, for metric and xy', () => {
    expect(renderer.environments).toEqual(['node']);
    expect(renderer.sized).toBe(true);
    expect(
      createElasticChartsHeadlessRenderer({ environments: ['node', 'browser'] })
        .environments
    ).toEqual(['node', 'browser']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
    expect(renderer.supports('table')).toBe(false);
  });

  it.each([
    ['metric', metricExamples[0]!.node],
    ['xyChart', xyChartExamples[0]!.node],
  ] as const)(
    'draws a %s through the charts pack at its size spec box',
    (_, node) => {
      const { width } = chartSize(
        chartSizeSpec(resolveChart(node as never, { scheme: 'light' }))!
      );
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
      expect(html).toMatch(new RegExp(`<svg[^>]* width="${width}"`));
    }
  );
});
