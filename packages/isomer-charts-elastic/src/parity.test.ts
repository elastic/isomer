/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer parity, content and events, over every example: what the headless
// engine draws for each Scene the charts pack hands it carries the Scene's
// strings and colors exactly, and every gesture the browser engine maps raises
// the Scene's own event. Look is compared in Chromium, in `e2e/`.

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Settings } from '@elastic/charts';
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  brushEvent,
  type ChartEvent,
  formatAxisValue,
  type GaugeScene,
  type HeatmapScene,
  type MetricScene,
  type PartitionScene,
  type Scene,
  SCENE_KINDS,
  type SceneAxis,
  type SceneKind,
  type SceneRenderEnv,
  selectEvent,
  type TagCloudScene,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import type { MetricNode } from '@elastic/isomer-primitives-charts/schema';
import { primitiveExamples } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { ariaDescriptionOf } from './accessibility';
import { seriesOf, type XyDatum } from './events';
import {
  createElasticChartsHeadlessRenderer,
  renderSceneSvg,
} from './headless';
import { drawExamples, type DrawnScene } from './parity.fixtures';
import { slicesOf } from './partition';
import { sceneSpecs } from './specs';

const headless = createElasticChartsHeadlessRenderer();
const { drawn, resolved, examples } = drawExamples([headless]);

const unescapeXml = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Every string the SVG draws as `<text>`, unescaped. */
const svgTexts = (svg: string): string[] =>
  [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) =>
    unescapeXml(text!)
  );

// Elastic Charts may break a string across lines, even mid-word.
const squash = (text: string) => text.replace(/\s+/g, '');

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

/**
 * `value` is drawn whole, or, where it does not fit, its start on one or more
 * lines and an ellipsis, as Elastic Charts cuts a metric's text.
 */
const expectDrawn = (texts: readonly string[], value: string) => {
  const whole = squash(value);
  if (squash(texts.join('')).includes(whole)) {
    return;
  }
  const cut = texts.some(
    (text, end) =>
      text.endsWith('…') &&
      texts.slice(0, end + 1).some((_, start) => {
        const shown = squash(texts.slice(start, end + 1).join('')).slice(0, -1);
        return shown.length > 0 && whole.startsWith(shown);
      })
  );
  expect(
    cut,
    `"${value}" drawn whole or cut, in ${JSON.stringify(texts)}`
  ).toBe(true);
};

/** A drawn tick's expected label: its category's label, or the value through `formatAxisValue`. */
const sceneLabel = (scene: XyScene, axis: SceneAxis, value: unknown) =>
  (axis.scale === 'ordinal'
    ? scene.categories.find(({ x }) => x === value)?.label
    : undefined) ?? formatAxisValue(scene, axis, value as number);

/** What every drawing of a Scene carries: its size, background, name and description. */
const expectChrome = ({ scene, markup }: DrawnScene) => {
  const [, open, title, desc] =
    /(<svg\b[^>]*>)(?:<title>([^<]*)<\/title>)?<desc>([^<]*)<\/desc>/.exec(
      markup
    ) ?? [];
  expect(open).toContain(` width="${scene.size!.width}"`);
  expect(open).toContain(` height="${scene.size!.height}"`);
  expect(open).toContain(' role="img"');
  expect(title && unescapeXml(title)).toBe(scene.title);
  expect(desc && unescapeXml(desc)).toBe(ariaDescriptionOf(scene));
  expect(markup).toContain(`fill="${scene.chrome.background}"`);
};

/** What each kind's drawing must carry, beyond {@link expectChrome}. A kind the engine draws without one fails the gate. */
const contentChecks: Partial<Record<SceneKind, (drawing: DrawnScene) => void>> =
  {
    xy: ({ scene, markup }) => {
      const xy = scene as XyScene;
      const texts = new Set(svgTexts(markup));
      const axes = [xy.axes.x, xy.axes.y, xy.axes.y2].flatMap((axis) =>
        axis ? [axis] : []
      );
      for (const { title } of axes) {
        if (title !== undefined) {
          expect(texts).toContain(title);
        }
      }
      // DebugState lists what Elastic Charts drew on each axis and in the legend.
      const { debugState } = renderSceneSvg(xy);
      const ticks = [
        ...(debugState?.axes?.x ?? []).map(
          (state) => [xy.axes.x, state] as const
        ),
        ...(debugState?.axes?.y ?? []).map(
          (state) => [xy.axes[state.id as 'y' | 'y2'], state] as const
        ),
      ];
      expect(ticks.length).toBeGreaterThan(0);
      for (const [axis, { labels, values }] of ticks) {
        expect(axis).toBeDefined();
        labels.forEach((label, index) => {
          if (label !== '') {
            expect(label).toBe(sceneLabel(xy, axis!, values[index]));
            expect(texts).toContain(label);
          }
        });
      }
      const series = seriesOf(xy);
      const painted = new Set(
        [...markup.matchAll(/<path\b[^>]*\b(?:fill|stroke)="([^"]+)"/g)].map(
          ([, color]) => rgbOf(color!)
        )
      );
      for (const { color } of series) {
        expect(painted).toContain(rgbOf(color));
      }
      expect(
        [
          ...(debugState?.bars ?? []),
          ...(debugState?.lines ?? []),
          ...(debugState?.areas ?? []),
        ]
          .map(({ name, color }) => `${name} ${color}`)
          .sort()
      ).toEqual(series.map(({ label, color }) => `${label} ${color}`).sort());
      if (xy.legend.visible) {
        expect(
          debugState?.legend?.items.map(({ name, color }) => ({ name, color }))
        ).toEqual(
          xy.legend.items.map(({ label, color }) => ({ name: label, color }))
        );
      }
    },
    partition: ({ scene, markup }) => {
      const partition = scene as PartitionScene;
      const texts = svgTexts(markup);
      if (partition.empty) {
        expect(texts).toEqual([partition.empty.text]);
        return;
      }
      // DebugState names each slice by its key; a waffle reports each square.
      const { debugState } = renderSceneSvg(partition);
      const drawnSlices = new Map(
        (debugState?.partition?.[0]?.partitions ?? []).map(
          ({ name, color, value }) => [name, { color, value }]
        )
      );
      const slices = slicesOf(partition.nodes);
      expect(drawnSlices.size).toBe(slices.length);
      for (const { key, color, value } of slices) {
        expect(drawnSlices.get(key), key).toEqual({ color, value });
      }
      // Every word drawn is a slice's name or value label, or a legend item's.
      const words = [
        ...slices.flatMap(({ label, valueLabel }) => [label, valueLabel]),
        ...partition.legend.items.flatMap(({ label, value }) => [
          label,
          value ?? '',
        ]),
      ].flatMap((text) => text.split(/\s+/));
      for (const text of texts.flatMap((one) => one.split(/\s+/))) {
        if (text) {
          expect(
            words.some((word) => word.includes(text.replace(/…$/, ''))),
            text
          ).toBe(true);
        }
      }
      for (const { label, value } of partition.legend.visible
        ? partition.legend.items
        : []) {
        expectDrawn(texts, label);
        if (value) {
          expectDrawn(texts, value);
        }
      }
    },
    tagCloud: ({ scene, markup }) => {
      const cloud = scene as TagCloudScene;
      const texts = svgTexts(markup);
      if (cloud.empty) {
        expect(texts).toEqual([cloud.empty.text]);
        return;
      }
      // Each word drawn is a Scene word in its color; the label in the text color.
      const drawnWords = [
        ...markup.matchAll(
          /<text\b[^>]*\bfill="([^"]+)"[^>]*>([^<]*)<\/text>/g
        ),
      ].map(([, fill, text]) => ({ fill: fill!, text: unescapeXml(text!) }));
      expect(drawnWords.length).toBeGreaterThan(0);
      for (const { fill, text } of drawnWords) {
        if (text === cloud.label) {
          expect(rgbOf(fill)).toBe(rgbOf(cloud.chrome.text));
          continue;
        }
        expect(
          cloud.words
            .filter((word) => word.text === text)
            .map(({ color }) => rgbOf(color)),
          text
        ).toContain(rgbOf(fill));
      }
      if (cloud.label !== undefined) {
        expect(texts).toContain(cloud.label);
      }
      // The heaviest word always fits: the cloud places words largest first.
      const heaviest = [...cloud.words].sort((a, b) => b.weight - a.weight)[0]!;
      expect(texts).toContain(heaviest.text);
    },
    gauge: ({ scene, markup }) => {
      const gauge = scene as GaugeScene;
      const texts = svgTexts(markup);
      if (gauge.empty) {
        expect(texts).toEqual([gauge.empty.text]);
        return;
      }
      // DebugState lists the bullet Elastic Charts drew, with its bands' colors.
      const { debugState } = renderSceneSvg(gauge);
      const [drawnGauge] = debugState?.bullet?.rows?.[0] ?? [];
      expect(drawnGauge).toMatchObject({
        title: gauge.labels.major,
        value: gauge.value,
        domain: [gauge.min, gauge.max],
      });
      expect(drawnGauge?.subtitle).toBe(gauge.labels.minor);
      expect(drawnGauge?.target).toBe(gauge.goal?.value);
      const colors = (drawnGauge?.colorBands ?? []).map((color) =>
        color.toUpperCase()
      );
      expect(gauge.bands.length === 1 ? [...new Set(colors)] : colors).toEqual(
        gauge.bands.map(({ color }) => color.toUpperCase())
      );
      const ticks = drawnGauge?.ticks ?? [];
      if (gauge.ticks) {
        expect(ticks).toEqual(gauge.ticks);
      }
      // Every string drawn is a label, the value, the goal or a tick's label.
      const strings = [
        gauge.labels.major,
        gauge.labels.minor ?? '',
        gauge.valueText,
        gauge.goal ? `/ ${gauge.goal.text}` : '',
        ...ticks.map((tick) => formatAxisValue(gauge, gauge, tick)),
      ].filter(Boolean);
      for (const text of texts) {
        expect(
          strings.some((string) =>
            squash(string).includes(squash(text).replace(/…$/, ''))
          ),
          text
        ).toBe(true);
      }
      expectDrawn(texts, gauge.valueText);
      if (gauge.labels.major) {
        expectDrawn(texts, gauge.labels.major);
      }
      if (gauge.goal) {
        expectDrawn(texts, gauge.goal.text);
      }
      // A circle's last tick lies on its first, and Elastic Charts drops it.
      for (const tick of ticks) {
        if (!(gauge.shape === 'circle' && tick === gauge.max)) {
          expectDrawn(texts, formatAxisValue(gauge, gauge, tick));
        }
      }
    },
    heatmap: ({ scene, markup }) => {
      const heatmap = scene as HeatmapScene;
      const texts = svgTexts(markup);
      if (heatmap.empty) {
        expect(texts).toEqual([heatmap.empty.text]);
        return;
      }
      // DebugState lists each cell Elastic Charts drew, by the datum it was given.
      const { debugState } = renderSceneSvg(heatmap);
      const cells = debugState?.heatmap?.cells ?? [];
      expect(cells).toHaveLength(heatmap.cells.length);
      for (const drawnCell of cells) {
        const { datum, fill, formatted } = drawnCell;
        // This Elastic Charts build reports it, though `CellDebug` does not declare it.
        const { valueShown } = drawnCell as { valueShown?: boolean };
        const cell =
          heatmap.cells[(datum as { originalIndex: number }).originalIndex];
        expect(cell).toBeDefined();
        // A cell in no band is transparent, whatever channels it names.
        const clear = /^#[\da-f]{6}00$/i.test(cell!.color);
        expect(fill.endsWith(', 0)')).toBe(clear);
        if (!clear) {
          expect(rgbOf(fill)).toBe(rgbOf(cell!.color));
        }
        expect(['', cell!.valueText]).toContain(formatted);
        expect(valueShown).toBe(heatmap.cellLabels);
      }
      const [xAxis] = debugState?.axes?.x ?? [];
      const [yAxis] = debugState?.axes?.y ?? [];
      xAxis?.labels.forEach((label, index) => {
        const value = xAxis.values[index] as number;
        expect(label).toBe(
          heatmap.x.scale === 'time'
            ? formatAxisValue(heatmap, heatmap.x, value)
            : heatmap.x.categories[value]!.label
        );
      });
      if (heatmap.x.scale === 'ordinal') {
        expect(xAxis?.labels).toEqual(
          heatmap.x.categories.map(({ label }) => label)
        );
      }
      expect(yAxis?.labels).toEqual(
        heatmap.y.categories.map(({ label }) => label)
      );
      expect(xAxis?.title).toBe(heatmap.x.title || undefined);
      expect(yAxis?.title).toBe(heatmap.y.title || undefined);
      if (heatmap.legend.visible) {
        expect(
          debugState?.legend?.items.map(({ name, color }) => ({ name, color }))
        ).toEqual(
          heatmap.bands.map(({ label, color }) => ({ name: label, color }))
        );
      }
      // Every string drawn is a position, a band, a cell's value or a title.
      const strings = new Set([
        ...(heatmap.x.showLabels ? (xAxis?.labels ?? []) : []),
        ...(heatmap.y.showLabels
          ? heatmap.y.categories.map(({ label }) => label)
          : []),
        ...(heatmap.legend.visible
          ? heatmap.bands.map(({ label }) => label)
          : []),
        ...(heatmap.cellLabels
          ? heatmap.cells.map(({ valueText }) => valueText)
          : []),
        ...[heatmap.x.title, heatmap.y.title].flatMap((title) =>
          title ? [title] : []
        ),
      ]);
      for (const text of texts) {
        expect(
          [...strings].some((string) =>
            squash(string).includes(squash(text).replace(/…$/, ''))
          ),
          text
        ).toBe(true);
      }
      for (const label of heatmap.y.showLabels
        ? heatmap.y.categories.map((category) => category.label)
        : []) {
        expectDrawn(texts, label);
      }
    },
    metric: ({ scene, markup }) => {
      const texts = svgTexts(markup);
      for (const tile of (scene as MetricScene).tiles) {
        expectDrawn(texts, tile.title);
        if (tile.subtitle) {
          expectDrawn(texts, tile.subtitle);
        }
        expectDrawn(texts, tile.value.text);
        if (tile.secondary) {
          expectDrawn(texts, tile.secondary.text);
        }
      }
    },
  };

const engineKinds = SCENE_KINDS.filter((kind) => headless.supports(kind));

describe('renderer parity: headless Elastic Charts', () => {
  it('has a content check for every kind it draws', () => {
    expect(engineKinds.filter((kind) => !contentChecks[kind])).toEqual([]);
  });

  it('draws every Scene of a kind it supports, in every example', () => {
    for (const example of examples) {
      const kinds = new Set(
        resolved
          .filter((entry) => entry.example === example)
          .map(({ kind }) => kind)
          .filter((kind) => engineKinds.includes(kind))
      );
      expect(
        new Set(
          drawn
            .filter((entry) => entry.example === example)
            .map(({ scene }) => scene.kind)
        )
      ).toEqual(kinds);
    }
    expect(new Set(drawn.map(({ scene }) => scene.kind))).toEqual(
      new Set(engineKinds)
    );
  });

  it.each(drawn.map((drawing) => ({ ...drawing, kind: drawing.scene.kind })))(
    '$example ($scheme): the $kind drawing carries the Scene’s strings and colors',
    (drawing) => {
      expect(drawing.scene.scheme).toBe(drawing.scheme);
      expectChrome(drawing);
      contentChecks[drawing.scene.kind]!(drawing);
    }
  );
});

// Every gesture the browser engine maps, built from what Elastic Charts
// reports for it, and the event the Scene part it lands on carries.
const NODE = 'parity';

const listen = () => {
  const events: ChartEvent[] = [];
  return {
    events,
    env: {
      environment: 'browser' as const,
      nodeId: NODE,
      onEvent: (event: ChartEvent) => events.push(event),
    },
  };
};

type Props = Record<string, unknown>;
type Callback = (...args: unknown[]) => unknown;

/** `node` and every element beneath it, fragments and children included. */
const elementsOf = (node: ReactNode): ReactElement<Props>[] =>
  Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Props>(child)) {
      return [];
    }
    const nested = elementsOf(child.props.children as ReactNode);
    return child.type === Fragment ? nested : [child, ...nested];
  });

/**
 * What the browser engine installs for `scene`: the `Settings` callbacks and
 * each series spec's id and data, read from the specs `<Chart>` is given.
 */
const installed = (scene: Scene, env: SceneRenderEnv) => {
  const elements = elementsOf(sceneSpecs(scene, env));
  const settings = elements.find(({ type }) => type === Settings)?.props;
  expect(settings, 'a Settings spec').toBeDefined();
  const callback = (name: string) => settings![name] as Callback | undefined;
  const series = elements.flatMap(({ props }) =>
    typeof props.id === 'string' && /^series-\d+$/.test(props.id)
      ? [{ id: props.id, data: props.data as readonly XyDatum[] }]
      : []
  );
  return { callback, series };
};

const gestures = (
  scene: Scene
): { gesture: string; raise: () => ChartEvent[]; expected: ChartEvent[] }[] => {
  if (scene.kind === 'metric') {
    return scene.tiles.flatMap((tile, index) =>
      tile.selection
        ? [
            {
              gesture: `click tile ${index}`,
              raise: () => {
                const { events, env } = listen();
                installed(scene, env).callback('onElementClick')?.([
                  {
                    type: 'metricElementEvent',
                    rowIndex: Math.floor(index / scene.layout.columns),
                    columnIndex: index % scene.layout.columns,
                  },
                ]);
                return events;
              },
              expected: [selectEvent(NODE, tile.selection)],
            },
          ]
        : []
    );
  }
  if (scene.kind === 'partition') {
    const offersSlices = scene.interactions.select.includes('slice');
    const paths = (
      nodes: PartitionScene['nodes'],
      keys: readonly string[]
    ): { keys: string[]; node: PartitionScene['nodes'][number] }[] =>
      nodes.flatMap((node) => [
        { keys: [...keys, node.key], node },
        ...paths(node.children, [...keys, node.key]),
      ]);
    const slices = paths(scene.nodes, []).map(({ keys, node }) => ({
      gesture: `click ${node.label}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            keys.map((key, depth) => ({
              groupByRollup: key,
              value: node.value,
              depth: depth + 1,
              sortIndex: 0,
              path: [],
              smAccessorValue: '',
            })),
            { specId: 'partition', key: 'spec{partition}' },
          ],
        ]);
        return events;
      },
      expected:
        offersSlices && node.selection
          ? [selectEvent(NODE, node.selection)]
          : [],
    }));
    // The buttons the installed legend action draws for each legend item.
    const legend = scene.legend.items.flatMap((item) =>
      [false, true].map((negate) => {
        const gesture = `filter ${negate ? 'out' : 'for'} ${item.label}`;
        return {
          gesture,
          raise: () => {
            const { events, env } = listen();
            const action = installed(scene, env).callback('legendAction');
            if (action) {
              const button = elementsOf(
                action({
                  series: [{ key: item.key }],
                  label: item.label,
                }) as ReactNode
              ).find(
                ({ type, props }) =>
                  type === 'button' &&
                  props['aria-label'] ===
                    `Filter ${negate ? 'out' : 'for'} ${item.label}`
              );
              expect(button, `${gesture}: its button`).toBeDefined();
              (button!.props.onClick as Callback)();
            }
            return events;
          },
          expected:
            offersSlices && item.selection
              ? [selectEvent(NODE, item.selection, negate)]
              : [],
        };
      })
    );
    return [...slices, ...legend];
  }
  if (scene.kind === 'tagCloud') {
    const offersTags = scene.interactions.select.includes('tag');
    return scene.words.map((word, index) => ({
      gesture: `click ${word.text}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            { text: word.text, weight: word.weight, color: word.color, index },
            { specId: 'tagCloud', key: 'tagCloud' },
          ],
        ]);
        return events;
      },
      expected:
        offersTags && word.selection ? [selectEvent(NODE, word.selection)] : [],
    }));
  }
  if (scene.kind === 'heatmap') {
    const offersCells = scene.interactions.select.includes('cell');
    const clicks = scene.cells.map((cell, index) => ({
      gesture: `click ${cell.description}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            {
              datum: {
                x: cell.x,
                y: cell.y,
                value: cell.value,
                originalIndex: index,
              },
              value: cell.value,
              formatted: cell.valueText,
            },
            { specId: 'heatmap', key: 'spec{heatmap}' },
          ],
        ]);
        return events;
      },
      expected:
        offersCells && cell.selection
          ? [selectEvent(NODE, cell.selection)]
          : [],
    }));
    const xs = scene.x.categories
      .map(({ x }) => x)
      .filter((x): x is number => typeof x === 'number');
    const brush =
      scene.x.scale === 'time' && xs.length > 1
        ? [
            {
              gesture: 'brush across the time axis',
              raise: () => {
                const { events, env } = listen();
                installed(scene, env).callback('onBrushEnd')?.({
                  x: [xs[0]!, xs.at(-1)! + scene.x.interval!],
                  y: [],
                  cells: [],
                });
                return events;
              },
              expected: [
                brushEvent(scene, NODE, [
                  xs[0]!,
                  xs.at(-1)! + scene.x.interval!,
                ]),
              ].flatMap((event) => (event ? [event] : [])),
            },
          ]
        : [];
    return [...clicks, ...brush];
  }
  if (scene.kind !== 'xy') {
    return [];
  }
  const offers = (target: string) =>
    (scene.interactions.select as readonly string[]).includes(target);
  const categoryAt = (x: number | string) =>
    scene.categories.find((category) => category.x === x);
  const series = seriesOf(scene);
  // Each Scene mark, and the datum at its x and y in its series' spec.
  const marks = series.flatMap((one, index) =>
    one.marks.map((mark) => {
      const selection = offers('datum')
        ? mark.selection
        : offers('category')
          ? categoryAt(mark.x)?.selection
          : undefined;
      const gesture = `click ${one.label} at ${String(mark.x)}`;
      return {
        gesture,
        raise: () => {
          const { events, env } = listen();
          const { callback, series: specs } = installed(scene, env);
          const spec = specs.find(({ id }) => id === `series-${index}`);
          const datum = spec?.data.find(
            ({ x, y }) => x === mark.x && y === mark.y
          );
          expect(datum, `${gesture}: its datum`).toBeDefined();
          callback('onElementClick')?.([
            [
              { x: datum!.x, y: datum!.y, mark: null, accessor: 'y1', datum },
              { specId: spec!.id, key: spec!.id },
            ],
          ]);
          return events;
        },
        expected: selection ? [selectEvent(NODE, selection)] : [],
      };
    })
  );
  const categories = scene.categories.map((category) => ({
    gesture: `click the plot at ${category.label}`,
    raise: () => {
      const { events, env } = listen();
      installed(scene, env).callback('onProjectionClick')?.({ x: category.x });
      return events;
    },
    expected:
      offers('category') && category.selection
        ? [selectEvent(NODE, category.selection)]
        : [],
  }));
  // The buttons the installed legend action draws for each series' item.
  const legend = series.flatMap((one, index) =>
    [false, true].map((negate) => {
      const item = scene.legend.items.find(
        ({ key, series: { layer, y } }) =>
          key === one.key && layer === one.series.layer && y === one.series.y
      );
      const gesture = `filter ${negate ? 'out' : 'for'} ${one.label}`;
      return {
        gesture,
        raise: () => {
          const { events, env } = listen();
          const { callback, series: specs } = installed(scene, env);
          const action = callback('legendAction');
          if (action) {
            const spec = specs.find(({ id }) => id === `series-${index}`);
            const button = elementsOf(
              action({
                series: [{ specId: spec!.id }],
                label: one.label,
              }) as ReactNode
            ).find(
              ({ type, props }) =>
                type === 'button' &&
                props['aria-label'] ===
                  `Filter ${negate ? 'out' : 'for'} ${one.label}`
            );
            expect(button, `${gesture}: its button`).toBeDefined();
            (button!.props.onClick as Callback)();
          }
          return events;
        },
        expected:
          offers('legend') && item?.selection
            ? [selectEvent(NODE, item.selection, negate)]
            : [],
      };
    })
  );
  const xs = scene.categories
    .map(({ x }) => x)
    .filter((x): x is number => typeof x === 'number');
  const brush =
    xs.length > 1
      ? [
          {
            gesture: 'brush across the x axis',
            raise: () => {
              const { events, env } = listen();
              installed(scene, env).callback('onBrushEnd')?.({
                x: [xs[0]!, xs.at(-1)!],
              });
              return events;
            },
            expected: [brushEvent(scene, NODE, [xs[0]!, xs.at(-1)!])].flatMap(
              (event) => (event ? [event] : [])
            ),
          },
        ]
      : [];
  return [...marks, ...categories, ...legend, ...brush];
};

describe('renderer parity: events from the browser engine', () => {
  // Each scheme resolves the same selections, so one is enough. No metric
  // example offers `tile`, so each is also resolved offering it.
  const tiles = primitiveExamples(
    createChartsPack().primitives.find(({ type }) => type === 'metric')!
  ).map(({ name, node }) => ({
    example: `metric: ${name ?? '(unnamed)'}, offering tile`,
    scene: resolveChart(
      { ...node, interactions: { select: ['tile'] } } as MetricNode,
      { scheme: 'light' }
    ),
  }));
  const scenes = [
    ...drawn.filter(({ scheme }) => scheme === 'light'),
    ...tiles,
  ];
  const interactive = scenes.filter(
    ({ scene }) =>
      scene.interactions.select.length > 0 || scene.interactions.brush
  );

  it('covers examples that offer every target and a brush', () => {
    const offered = new Set(
      interactive.flatMap(({ scene }) => scene.interactions.select)
    );
    expect([...offered].sort()).toEqual(
      expect.arrayContaining([
        'category',
        'cell',
        'datum',
        'legend',
        'slice',
        'tag',
        'tile',
      ])
    );
    expect(interactive.some(({ scene }) => scene.interactions.brush)).toBe(
      true
    );
  });

  it.each(scenes.map((drawing) => ({ ...drawing, kind: drawing.scene.kind })))(
    '$example: every gesture on the $kind raises the Scene’s event, and only where the node offers it',
    ({ scene }) => {
      for (const { gesture, raise, expected } of gestures(scene)) {
        expect(raise(), gesture).toEqual(expected);
      }
    }
  );
});
