/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SvgFont } from '@elastic/charts/dist/headless';
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

import { ariaDescriptionOf } from './accessibility';
import { seriesOf } from './events';
import {
  createElasticChartsHeadlessRenderer,
  renderSceneSvg,
  scopeSvgIds,
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

/** A `#rrggbb[aa]` or `rgb[a](…)` color's channels, as `r,g,b`. */
const rgbOf = (color: string): string => {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(color);
  return hex
    ? hex
        .slice(1, 4)
        .map((pair) => parseInt(pair, 16))
        .join(',')
    : (/^rgba?\(([^)]*)\)/.exec(color)?.[1] ?? color)
        .split(',')
        .slice(0, 3)
        .map((channel) => Number(channel.trim()))
        .join(',');
};

/** The SVG's opening tag, `<title>` and `<desc>`. */
const namedBy = (svg: string) =>
  /^(<svg\b[^>]*>)(?:<title>([^<]*)<\/title>)?<desc>([^<]*)<\/desc>/.exec(
    svg
  ) ?? [];

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
  ])(
    '$name ($scheme) names the SVG by its title and description',
    ({ scene }) => {
      const { svg } = renderSceneSvg(scene);
      const [, open, title, desc] = namedBy(svg);
      expect(open).toContain(' role="img"');
      expect(title && unescapeXml(title)).toBe(scene.title);
      expect(desc && unescapeXml(desc)).toBe(ariaDescriptionOf(scene));
    }
  );

  it('describes the SVG by its summary, then its authored description', () => {
    const { scene } = xyCases[0]!;
    const description = 'Requests per minute, from the edge proxies.';
    const [, , , desc] = namedBy(renderSceneSvg({ ...scene, description }).svg);
    expect(unescapeXml(desc!)).toBe(`${scene.summary} ${description}`);
  });

  it.each(xyCases)(
    '$name ($scheme) draws every series’ marks in its color',
    ({ scene }) => {
      const painted = new Set(
        [
          ...renderSceneSvg(scene).svg.matchAll(
            /<path\b[^>]*\b(?:fill|stroke)="([^"]+)"/g
          ),
        ].map(([, color]) => rgbOf(color!))
      );
      for (const { color } of seriesOf(scene)) {
        expect(painted).toContain(rgbOf(color));
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

describe('scopeSvgIds', () => {
  it('prefixes each id and every reference to it', () => {
    expect(
      scopeSvgIds(
        '<svg><clipPath id="clip0"/><g clip-path="url(#clip0)"/><use href="#clip0"/></svg>',
        's'
      )
    ).toBe(
      '<svg><clipPath id="s-clip0"/><g clip-path="url(#s-clip0)"/><use href="#s-clip0"/></svg>'
    );
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

  const markup = (node: unknown) =>
    renderToStaticMarkup(createElement('div', null, node as never));

  it('measures text with a given measure', () => {
    const { scene } = xyCases[0]!;
    const measured: string[] = [];
    const measuring = createElasticChartsHeadlessRenderer({
      measureTextWidth: (text) => {
        measured.push(text);
        return text.length * 7;
      },
    });
    const svg = markup(measuring.render(scene, { environment: 'node' }));
    expect(measured.length).toBeGreaterThan(0);
    expect(measured).toEqual(expect.arrayContaining(svgTexts(svg)));
  });

  it('draws text as a given font’s outlines, with no SVG text', () => {
    const { scene } = xyCases[0]!;
    const outlined: string[] = [];
    const font: SvgFont = {
      family: 'Outline',
      measure: (text) => text.length * 7,
      toPath: (text, _font, x, y) => {
        outlined.push(text);
        return `M${x} ${y}h1`;
      },
    };
    const svg = markup(
      createElasticChartsHeadlessRenderer({ font }).render(scene, {
        environment: 'node',
      })
    );
    expect(outlined.length).toBeGreaterThan(0);
    expect(svgTexts(svg)).toEqual([]);
    expect(svg).toMatch(/<path\b[^>]* d="M[^"]*h1"/);
  });

  it('draws at its size on Node, and scales at its aspect ratio in a browser', () => {
    const { scene } = xyCases[0]!;
    const { width, height } = scene.size!;
    const node = markup(renderer.render(scene, { environment: 'node' }));
    expect(node).toContain(`width:${width}px;height:${height}px`);
    expect(node).toContain(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"`
    );
    const browser = markup(
      createElasticChartsHeadlessRenderer({ environments: ['browser'] }).render(
        scene,
        { environment: 'browser' }
      )
    );
    expect(browser).toContain(
      `width:100%;max-width:${width}px;aspect-ratio:${width} / ${height}`
    );
    expect(browser).toContain('width="100%" height="100%"');
  });

  it('gives every chart on a page its own ids', () => {
    const runtime = createIsomerRuntime({
      packs: [createChartsPack({ sceneRenderers: [renderer] })],
    });
    const html = markup(
      runtime.surfaces.react.render(
        {
          type: 'view',
          body: [...xyChartExamples, ...metricExamples].map(({ node }) => node),
        },
        { heading: false }
      )
    );
    const svgs = html.split('<svg ').slice(1);
    expect(svgs.length).toBeGreaterThan(1);
    const owners = new Map<string, number>();
    svgs.forEach((svg, index) => {
      for (const [, id] of svg.matchAll(/\bid="([^"]+)"/g)) {
        expect(owners.get(id!) ?? index).toBe(index);
        owners.set(id!, index);
      }
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) {
        expect(owners.get(ref!)).toBe(index);
      }
    });
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
