/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values are the Scene's own: every string and color `isomer-svg`
// shows must be one the Scene states, and nothing may come from CSS.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { metricSingleValueScene, xyTimeSeriesScene } from '../scene/examples';
import type { Scene, XyScene } from '../scene/types';

import { drawScene, sceneDrawSize } from './draw';
import { toReactDom } from './react_dom';
import {
  gapsScene,
  horizontalBarsScene,
  stackedBarsScene,
  tilesScene,
} from './scenes.fixtures';
import { SVG_THEME } from './theme';
import { type SvgElement, svgText, toSvgMarkup, walkSvg } from './tree';

const scenes: { name: string; scene: Scene }[] = [
  { name: 'metric single value', scene: metricSingleValueScene },
  { name: 'xy time series', scene: xyTimeSeriesScene },
  { name: 'stacked bars', scene: stackedBarsScene },
  { name: 'gaps', scene: gapsScene },
  { name: 'horizontal bars', scene: horizontalBarsScene },
  { name: 'tiles', scene: tilesScene },
];

const hiddenKeys = (scene: Scene) =>
  scene.kind === 'xy'
    ? new Set(scene.legend.items.filter((i) => i.hidden).map((i) => i.key))
    : new Set<string>();

/** Every string the Scene says is drawn. */
const expectedStrings = (scene: Scene): string[] => {
  if (scene.kind === 'metric') {
    return scene.tiles.flatMap((tile) => [
      tile.title,
      ...(tile.subtitle ? [tile.subtitle] : []),
      tile.value.text,
      ...(tile.secondary ? [tile.secondary.text] : []),
    ]);
  }
  const axes = [scene.axes.x, scene.axes.y, scene.axes.y2].filter(
    (axis) => axis !== undefined
  );
  const hidden = hiddenKeys(scene);
  return [
    ...axes.flatMap((axis) => [
      ...(axis.showTicks ? axis.ticks.map(({ label }) => label) : []),
      ...(axis.title ? [axis.title] : []),
    ]),
    ...(scene.legend.visible
      ? [
          ...(scene.legend.header ? [scene.legend.header] : []),
          ...scene.legend.items.flatMap((item) => [
            item.label,
            ...item.statistics.map(({ value }) => value),
          ]),
        ]
      : []),
    ...scene.series
      .filter((s) => s.valueLabels && !hidden.has(s.key))
      .flatMap((s) => s.marks.filter((m) => m.y !== null).map((m) => m.label)),
    ...scene.referenceLines.flatMap(({ label }) => (label ? [label] : [])),
    ...scene.annotations.flatMap(({ label }) => (label ? [label] : [])),
  ];
};

const paints = (drawing: SvgElement) =>
  walkSvg(drawing).flatMap((element) =>
    ['fill', 'stroke']
      .map((name) => element.attrs[name])
      .filter((value) => value !== undefined)
      .map(String)
  );

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const seriesGroups = (drawing: SvgElement) =>
  walkSvg(drawing).filter((element) => element.attrs['data-series']);

describe('isomer-svg', () => {
  it.each(scenes)('$name: draws every string the Scene states', ({ scene }) => {
    const drawn = svgText(drawScene(scene)).join('\n');
    for (const expected of expectedStrings(scene)) {
      expect(drawn).toContain(expected);
    }
  });

  it.each(scenes)(
    '$name: paints only literal colors, and every visible series color',
    ({ scene }) => {
      const drawing = drawScene(scene);
      const used = paints(drawing);
      for (const value of used) {
        expect(value).toMatch(/^(#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?|none)$/);
      }
      expect(used).toContain(scene.chrome.background);
      if (scene.kind === 'xy') {
        const hidden = hiddenKeys(scene);
        for (const s of scene.series.filter(({ key }) => !hidden.has(key))) {
          expect(used).toContain(s.color);
        }
      } else {
        for (const tile of scene.tiles) {
          expect(used).toContain(tile.value.color);
          expect(used).toContain(tile.background);
        }
      }
    }
  );

  it.each(scenes)(
    '$name: is an image labelled with the summary, at the Scene size',
    ({ scene }) => {
      const drawing = drawScene(scene);
      const size = sceneDrawSize(scene);
      expect(drawing.attrs).toMatchObject({
        role: 'img',
        'aria-label': scene.summary,
        width: size.width,
        height: size.height,
      });
      if (scene.size) {
        expect(size).toEqual(scene.size);
      }
    }
  );

  it.each(scenes)('$name: keeps every mark inside the drawing', ({ scene }) => {
    const { width, height } = sceneDrawSize(scene);
    for (const element of walkSvg(drawScene(scene))) {
      if (element.tag === 'rect' || element.tag === 'circle') {
        const {
          x = 0,
          y = 0,
          cx,
          cy,
          width: w = 0,
          height: h = 0,
        } = element.attrs as Record<string, number>;
        const left = cx ?? x;
        const top = cy ?? y;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(left + w).toBeLessThanOrEqual(width + 0.01);
        expect(top + h).toBeLessThanOrEqual(height + 0.01);
      }
    }
  });

  it('does not draw a series its legend item hides', () => {
    const keys = seriesGroups(drawScene(stackedBarsScene)).map(
      ({ attrs }) => attrs['data-series']
    );
    expect(keys).toEqual(['ok', 'error', 'latency']);
  });

  it('draws series in the Scene draw order', () => {
    const keys = seriesGroups(drawScene(gapsScene)).map(
      ({ attrs }) => attrs['data-series']
    );
    expect(keys).toEqual(gapsScene.series.map(({ key }) => key));
  });

  it('breaks a line at a null with no fitting, and dashes a fitted gap when emphasized', () => {
    const [broken, fitted] = seriesGroups(drawScene(gapsScene));
    const strokes = (group: SvgElement) =>
      walkSvg(group).filter(
        ({ tag, attrs }) => tag === 'path' && attrs.fill === 'none'
      );
    expect(strokes(broken!)).toHaveLength(2);
    const fittedStrokes = strokes(fitted!);
    expect(
      fittedStrokes.filter(
        ({ attrs }) => attrs['stroke-dasharray'] === SVG_THEME.xy.fittedDash
      )
    ).toHaveLength(1);
    expect(fittedStrokes.length).toBeGreaterThan(1);
  });

  it('stacks bars from y0 and grows them with their value', () => {
    const bars = (scene: XyScene, key: string) =>
      walkSvg(
        seriesGroups(drawScene(scene)).find(
          ({ attrs }) => attrs['data-series'] === key
        )!
      )
        .filter(({ tag }) => tag === 'rect')
        .map(({ attrs }) => attrs as unknown as Rect);
    const ok = bars(stackedBarsScene, 'ok');
    const error = bars(stackedBarsScene, 'error');
    // Values 60, 40, 30: taller first. Errors sit on top of their ok bar.
    expect(ok.map(({ height }) => height)).toEqual(
      [...ok.map(({ height }) => height)].sort((a, b) => b - a)
    );
    ok.forEach((bar, index) => {
      expect(error[index]!.y + error[index]!.height).toBeCloseTo(bar.y, 1);
      expect(error[index]!.x).toBeCloseTo(bar.x, 5);
    });
    const horizontal = bars(horizontalBarsScene, 'ok');
    expect(horizontal.map(({ width }) => width)).toEqual(
      [...horizontal.map(({ width }) => width)].sort((a, b) => b - a)
    );
    expect(new Set(horizontal.map(({ x }) => x)).size).toBe(1);
  });

  it('draws a partial bucket at the partial opacity', () => {
    const partial = walkSvg(drawScene(stackedBarsScene)).filter(
      ({ attrs }) => attrs['fill-opacity'] === SVG_THEME.xy.partialOpacity
    );
    expect(partial.map(({ attrs }) => attrs['data-row'])).toEqual(['5']);
  });

  it('draws helper marks with the Scene colors', () => {
    const used = paints(drawScene(stackedBarsScene));
    expect(used).toContain(stackedBarsScene.referenceLines[0]!.color);
    const gaps = paints(drawScene(gapsScene));
    for (const annotation of gapsScene.annotations) {
      expect(gaps).toContain(annotation.color);
    }
    expect(gaps).toContain(gapsScene.chrome.text);
  });

  it('clamps a progress fraction and draws the trend line', () => {
    const drawing = drawScene(tilesScene);
    const progress = walkSvg(drawing).filter(
      ({ attrs }) => attrs['data-part'] === 'progress'
    );
    expect(progress).toHaveLength(2);
    const [track, bar] = (progress[1]!.children as SvgElement[]).map(
      ({ attrs }) => attrs as unknown as Rect
    );
    expect(bar!.height).toBe(track!.height);
    expect(
      walkSvg(drawing).filter(({ attrs }) => attrs['data-part'] === 'trend')
    ).toHaveLength(1);
  });

  it('serializes to markup with escaped text', () => {
    const markup = toSvgMarkup(
      drawScene({ ...metricSingleValueScene, summary: 'a < b & "c"' })
    );
    expect(markup.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true
    );
    expect(markup).toContain('aria-label="a &lt; b &amp; &quot;c&quot;"');
    expect(markup).toContain('<desc>a &lt; b &amp; "c"</desc>');
  });

  it('binds to React DOM without warnings, keeping SVG attribute names', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToStaticMarkup(
      toReactDom(drawScene(stackedBarsScene)) as never
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('aria-label="');
    expect(html).toContain('data-series="ok"');
    expect(html).toBe(
      renderToStaticMarkup(toReactDom(drawScene(stackedBarsScene)) as never)
    );
  });
});
